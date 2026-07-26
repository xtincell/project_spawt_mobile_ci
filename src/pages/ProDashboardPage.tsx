// /pro/dashboard — tableau de bord lieux (auth requis), branché sur les
// vraies vues SQL des migrations 0042/0043 via lib/b2b-data.
//
// Décisions produit/RLS (vérifiées dans le repo app, cf. lib/b2b-data.ts) :
//  - Agrégats seuillés : toute valeur NULL (n<3 dans le mois) s'affiche « — »
//    avec une infobulle qui explique le seuil anti-réidentification.
//  - SOUSCRIPTION EN LIGNE (plus de mailto d'upsell) : un compte relié sans
//    abonnement payant actif voit le panneau « Passe en Spawt Pro / Gold »
//    (onglet Abonnement) → checkout via le MÊME payment-checkout que /gold,
//    plans 'pro' (15 000 F HT) / 'b2b_gold' (65 000 F HT), retour
//    /pro/retour. Abonnement actif → statut (plan, échéance, grâce) +
//    factures (RLS own). Le compte NON relié garde le mailto : le
//    rattachement lieu↔compte est la vérification du lieu par l'équipe
//    (process métier), le paiement, lui, est 100 % en ligne.
//  - Funnel = réservé au role 'gold' → un compte 'pro' voit l'upsell Spawt
//    Gold avec souscription en ligne directe (le webhook synchronise le rôle
//    à l'activation du plan b2b_gold).
//  - Réservations : lecture seule (0042 ne donne l'UPDATE qu'au spawter ;
//    0043 ne donne que le SELECT au B2B) — l'UI l'assume et l'explique.
//  - Avis : la RLS 0021 rend les avis PUBLIÉS lisibles par tout compte
//    authentifié — l'onglet liste donc les mêmes avis publics que l'app,
//    sans réponse possible depuis le portail (offre Pro à venir côté app).
//  - Rapport mensuel : vue print dédiée (@media print dans global.css) +
//    window.print() — le navigateur génère le PDF, zéro dépendance.
//  - Graphiques : SVG maison (recharts n'est pas en deps, on n'ajoute rien).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  fetchB2bAccount,
  fetchB2bSubscription,
  fetchPlaceInfo,
  fetchPlaceMonthlyStats,
  fetchPlaceFunnel,
  fetchReservationRequests,
  fetchPlaceReviews,
  isGoldAccount,
  lastMonthKeys,
  findMonthRow,
  formatMonthFr,
  formatStatValue,
  countReservationsInMonth,
  computeTtc,
  b2bPlanLabel,
  B2B_PLAN_CATALOG,
  type B2bAccount,
  type B2bDataResult,
  type B2bPlanCode,
  type B2bSubscriptionResult,
  type PlaceInfo,
  type PlaceMonthlyStats,
  type PlaceFunnelMonth,
  type ReservationRequest,
  type PlaceReview,
} from "../lib/b2b-data";
import { fetchInvoices, formatDateFr, formatFcfa, type InvoicesResult } from "../lib/invoices";
import { ApiError, redirectTo, startCheckout } from "../lib/api";
import { CONTACT_EMAIL } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

type Tab = "apercu" | "reservations" | "avis" | "audience" | "abonnement";

type AccountState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "linked"; account: B2bAccount }
  | { kind: "error" };

interface DashboardData {
  place: PlaceInfo | null;
  monthly: B2bDataResult<PlaceMonthlyStats>;
  reservations: B2bDataResult<ReservationRequest>;
  reviews: B2bDataResult<PlaceReview>;
  /** null = compte pro : le funnel n'est jamais demandé (gate gold en SQL). */
  funnel: B2bDataResult<PlaceFunnelMonth> | null;
  /** Abonnement payant du lieu (vue active_entitlements, plans pro/b2b_gold). */
  subscription: B2bSubscriptionResult;
  /** Factures du compte (RLS own — couvre le customer B2B). */
  invoices: InvoicesResult;
}

/** Infobulle du seuil n<3 — même règle que les vues SQL 0043. */
const SEUIL_TOOLTIP =
  "Moins de 3 événements ce mois-là : on n'affiche rien plutôt que de laisser " +
  "deviner qui a spawté ou noté. L'anonymat de la Meute n'est pas négociable.";

const STATUS_LABELS: Record<string, string> = {
  sent: "Envoyée",
  confirmed: "Confirmée",
  cancelled: "Annulée",
};

const STATUS_PILLS: Record<string, string> = {
  sent: "pill--warm",
  confirmed: "pill--accent",
  cancelled: "pill--danger",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Appel",
};

/** Mois court FR (« juil. 2026 ») pour les axes de graphique. */
function monthShortFr(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return key;
  return new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(d);
}

/** Créneau demandé : « 26 juil. 2026, 20:30 » (ou — sans créneau précis). */
function formatSlotFr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Valeur d'agrégat : nombre, ou « — » avec l'infobulle du seuil n<3. */
function StatValue({ value, suffix }: { value: number | null | undefined; suffix?: string }) {
  if (value === null || value === undefined) {
    return (
      <span className="seuil" title={SEUIL_TOOLTIP} aria-label={`Non affiché. ${SEUIL_TOOLTIP}`}>
        —
      </span>
    );
  }
  return (
    <>
      {formatStatValue(value)}
      {suffix ? <span className="stat-card__suffix">{suffix}</span> : null}
    </>
  );
}

/** Note en étoiles pleines/creuses (1 à 5), lisible aussi au lecteur d'écran. */
function Stars({ note }: { note: number }) {
  const n = Math.min(5, Math.max(1, Math.round(note)));
  return (
    <span className="stars" aria-label={`${n} étoiles sur 5`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

/** Barres mensuelles en SVG maison — aucune dépendance graphique. */
function BarChart({
  series,
  ariaLabel,
}: {
  series: Array<{ label: string; value: number | null }>;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...series.map((p) => p.value ?? 0));
  const barW = 36;
  const gap = 20;
  const chartH = 110;
  const width = series.length * (barW + gap) + gap;
  const height = chartH + 30;
  return (
    <svg
      className="bar-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1="0" y1={chartH + 0.5} x2={width} y2={chartH + 0.5} className="bar-chart__axis" />
      {series.map((p, i) => {
        const x = gap + i * (barW + gap);
        const h = p.value === null ? 0 : Math.max(4, Math.round((p.value / max) * (chartH - 20)));
        return (
          <g key={p.label + String(i)}>
            {p.value === null ? (
              <text x={x + barW / 2} y={chartH - 6} textAnchor="middle" className="bar-chart__empty">
                —
              </text>
            ) : (
              <>
                <rect x={x} y={chartH - h} width={barW} height={h} rx="4" className="bar-chart__bar">
                  <title>{`${p.label} : ${formatStatValue(p.value)}`}</title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={chartH - h - 6}
                  textAnchor="middle"
                  className="bar-chart__value"
                >
                  {formatStatValue(p.value)}
                </text>
              </>
            )}
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" className="bar-chart__label">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Panneau de repli commun : vue absente (« en construction ») ou erreur. */
function Fallback({ reason, notReadyText }: { reason: "not_ready" | "error"; notReadyText: string }) {
  if (reason === "not_ready") {
    return (
      <p>
        <span className="pill pill--warm">Stats en construction</span>
        <br />
        {notReadyText}
      </p>
    );
  }
  return (
    <p className="notice notice--danger" role="alert">
      Impossible de charger cette section pour l'instant. Recharge la page ou réessaie plus tard.
    </p>
  );
}

// ── Onglet Aperçu ─────────────────────────────────────────────────

function ApercuTab({
  data,
  monthKeys,
  isGold,
}: {
  data: DashboardData;
  monthKeys: string[];
  isGold: boolean;
}) {
  const currentKey = monthKeys[0];
  if (!data.monthly.available) {
    return (
      <div className="card" role="tabpanel">
        <h3>Le mois de ton lieu</h3>
        <Fallback
          reason={data.monthly.reason === "error" ? "error" : "not_ready"}
          notReadyText="Spawts vérifiés, avis et note pondérée arrivent ici dès que la vue de stats sera déployée."
        />
      </div>
    );
  }
  const rows = data.monthly.rows;
  const current = findMonthRow(rows, currentKey);
  const resasCount = data.reservations.available
    ? countReservationsInMonth(data.reservations.rows, currentKey)
    : null;
  const chartSeries = [...monthKeys].reverse().map((key) => ({
    label: monthShortFr(key),
    value: findMonthRow(rows, key)?.spawts_verifies ?? null,
  }));

  return (
    <div role="tabpanel">
      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-card__value">
            <StatValue value={current?.spawts_verifies ?? null} />
          </p>
          <p className="stat-card__label">Spawts vérifiés ce mois</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">
            <StatValue value={current?.avis ?? null} />
          </p>
          <p className="stat-card__label">Avis reçus ce mois</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">
            <StatValue value={current?.note_moyenne_ponderee ?? null} suffix=" / 5" />
          </p>
          <p className="stat-card__label">Note pondérée par stade</p>
        </div>
        <div className="stat-card">
          <p className="stat-card__value">
            <StatValue value={resasCount} />
          </p>
          <p className="stat-card__label">Résas reçues ce mois</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--sp-base)" }}>
        <h3>Spawts vérifiés — 6 derniers mois</h3>
        <BarChart
          series={chartSeries}
          ariaLabel="Spawts vérifiés par mois sur les six derniers mois"
        />
      </div>

      <div className="card" style={{ marginTop: "var(--sp-base)" }}>
        <h3>Le détail, mois par mois</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Mois</th>
                <th scope="col">Spawts vérifiés</th>
                <th scope="col">Avis</th>
                <th scope="col">Note /5</th>
              </tr>
            </thead>
            <tbody>
              {monthKeys.map((key) => {
                const row = findMonthRow(rows, key);
                return (
                  <tr key={key}>
                    <td>{formatMonthFr(key)}</td>
                    <td>
                      <StatValue value={row?.spawts_verifies ?? null} />
                    </td>
                    <td>
                      <StatValue value={row?.avis ?? null} />
                    </td>
                    <td>
                      <StatValue value={row?.note_moyenne_ponderee ?? null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!isGold && (
          <p style={{ marginTop: "var(--sp-base)", color: "var(--ink-soft)" }}>
            Envie de voir aussi qui te regarde sans encore pousser ta porte&nbsp;? Le funnel
            complet est dans l'onglet Audience, avec Spawt Gold.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Onglet Réservations ───────────────────────────────────────────

function ReservationsTab({ result }: { result: B2bDataResult<ReservationRequest> }) {
  return (
    <div className="card" role="tabpanel">
      <h3>Les demandes de table</h3>
      {!result.available ? (
        <Fallback
          reason={result.reason === "error" ? "error" : "not_ready"}
          notReadyText="Les demandes de réservation 1-tap venues de l'app arriveront ici."
        />
      ) : result.rows.length === 0 ? (
        <p>
          Aucune demande pour l'instant. Quand un spawter demandera ta table depuis l'app,
          elle apparaîtra ici.
        </p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Reçue le</th>
                  <th scope="col">Pour</th>
                  <th scope="col">Couverts</th>
                  <th scope="col">Canal</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateFr(r.created_at)}</td>
                    <td>{formatSlotFr(r.slot_at)}</td>
                    <td>{r.party_size} pers.</td>
                    <td>{CHANNEL_LABELS[r.channel] ?? r.channel}</td>
                    <td>
                      <span className={`pill ${STATUS_PILLS[r.status] ?? "pill--warm"}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: "var(--sp-base)", color: "var(--ink-soft)" }}>
            La confirmation se joue directement avec le spawter (WhatsApp ou appel)&nbsp;: le
            statut affiché est celui qu'il met à jour dans l'app — il n'est pas modifiable
            depuis le portail.
          </p>
        </>
      )}
    </div>
  );
}

// ── Onglet Avis ───────────────────────────────────────────────────

function AvisTab({ data, currentKey }: { data: DashboardData; currentKey: string }) {
  const current = data.monthly.available ? findMonthRow(data.monthly.rows, currentKey) : null;
  return (
    <div className="card" role="tabpanel">
      <h3>Les avis sur ton lieu</h3>
      {data.monthly.available && (
        <p style={{ color: "var(--ink-soft)" }}>
          Ce mois-ci&nbsp;: note pondérée{" "}
          <strong>
            <StatValue value={current?.note_moyenne_ponderee ?? null} suffix=" / 5" />
          </strong>{" "}
          pour <StatValue value={current?.avis ?? null} /> avis.
        </p>
      )}
      {!data.reviews.available ? (
        <Fallback
          reason={data.reviews.reason === "error" ? "error" : "not_ready"}
          notReadyText="Les avis publics de ton lieu arriveront ici — les mêmes que ceux visibles dans l'app."
        />
      ) : data.reviews.rows.length === 0 ? (
        <p>Pas encore d'avis publié. Ça vient avec les spawts — la Meute finit toujours par parler.</p>
      ) : (
        <ul className="review-list">
          {data.reviews.rows.map((avis) => (
            <li key={avis.id} className="review-item">
              <p className="review-item__head">
                <Stars note={avis.note_etoiles} />
                <span className="review-item__meta">
                  {avis.spawters_public?.display_name ?? "Un spawter"}
                  {avis.spawters_public?.stade ? ` · ${avis.spawters_public.stade}` : ""} —{" "}
                  {formatDateFr(avis.created_at)}
                </span>
              </p>
              {avis.texte_avis && <p className="review-item__text">{avis.texte_avis}</p>}
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: "var(--sp-base)", color: "var(--ink-mute)", fontSize: "var(--fs-sm)" }}>
        Ce sont les avis publics, tels que la Meute les voit dans l'app. Ils lui
        appartiennent&nbsp;: pas de réponse ni de modération depuis le portail.
      </p>
    </div>
  );
}

// ── Onglet Audience (funnel Gold / upsell) ────────────────────────

function FunnelBars({ month }: { month: PlaceFunnelMonth | null }) {
  const steps = [
    { label: "Vues de fiche", value: month?.views ?? null },
    { label: "Sauvegardes", value: month?.saves ?? null },
    { label: "Partages", value: month?.shares ?? null },
    { label: "Spawts", value: month?.spawts ?? null },
  ];
  const max = Math.max(1, ...steps.map((s) => s.value ?? 0));
  return (
    <div className="funnel">
      {steps.map((s) => (
        <div key={s.label} className="funnel__step">
          <span className="funnel__label">{s.label}</span>
          <span className="funnel__track">
            <span
              className="funnel__bar"
              style={{ width: `${s.value === null ? 0 : Math.max(2, (s.value / max) * 100)}%` }}
              aria-hidden="true"
            />
          </span>
          <span className="funnel__value">
            <StatValue value={s.value} />
          </span>
        </div>
      ))}
    </div>
  );
}

function AudienceGoldTab({
  funnel,
  monthKeys,
}: {
  funnel: B2bDataResult<PlaceFunnelMonth>;
  monthKeys: string[];
}) {
  const currentKey = monthKeys[0];
  return (
    <div className="card" role="tabpanel">
      <h3>Qui pousse ta porte</h3>
      {!funnel.available ? (
        <Fallback
          reason={funnel.reason === "error" ? "error" : "not_ready"}
          notReadyText="Le funnel découverte → venue arrivera ici dès que la vue sera déployée."
        />
      ) : (
        <>
          <p style={{ color: "var(--ink-soft)" }}>
            {formatMonthFr(currentKey)} — de la fiche vue au spawt posé&nbsp;:
          </p>
          <FunnelBars month={findMonthRow(funnel.rows, currentKey)} />
          <div className="table-wrap" style={{ marginTop: "var(--sp-lg)" }}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Mois</th>
                  <th scope="col">Vues</th>
                  <th scope="col">Sauvegardes</th>
                  <th scope="col">Partages</th>
                  <th scope="col">Spawts</th>
                </tr>
              </thead>
              <tbody>
                {monthKeys.map((key) => {
                  const row = findMonthRow(funnel.rows, key);
                  return (
                    <tr key={key}>
                      <td>{formatMonthFr(key)}</td>
                      <td>
                        <StatValue value={row?.views ?? null} />
                      </td>
                      <td>
                        <StatValue value={row?.saves ?? null} />
                      </td>
                      <td>
                        <StatValue value={row?.shares ?? null} />
                      </td>
                      <td>
                        <StatValue value={row?.spawts ?? null} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function UpsellGoldTab({
  busyPlan,
  checkoutError,
  onSubscribe,
}: {
  busyPlan: B2bPlanCode | null;
  checkoutError: string | null;
  onSubscribe: (plan: B2bPlanCode) => void;
}) {
  const gold = B2B_PLAN_CATALOG.b2b_gold;
  return (
    <div className="card" role="tabpanel">
      <article className="price-card price-card--featured" style={{ maxWidth: 520 }}>
        <span className="price-card__flag">Spawt Gold</span>
        <h3>Vois venir la Meute avant qu'elle s'assoie</h3>
        <p className="price-card__amount">
          {formatFcfa(gold.priceHt)}
          <span className="price-card__period"> HT /mois</span>
        </p>
        <p className="price-card__ht">
          + TVA 18&nbsp;% — soit {formatFcfa(computeTtc(gold.priceHt))} TTC /mois
        </p>
        <ul>
          <li>Le funnel complet&nbsp;: vues de fiche → sauvegardes → spawts, mois par mois</li>
          <li>Les tendances de ton lieu&nbsp;: ce qui monte, ce qui s'essouffle</li>
          <li>Les archétypes qui te regardent — parle à ceux qui te choisissent déjà</li>
          <li>Benchmark face aux lieux comparables de ton quartier</li>
        </ul>
        <button
          type="button"
          className="btn btn--gold"
          onClick={() => onSubscribe("b2b_gold")}
          disabled={busyPlan !== null}
        >
          {busyPlan === "b2b_gold" ? "Ouverture du paiement…" : "Passer Gold — payer en ligne"}
        </button>
        {checkoutError && (
          <p className="form-error" role="alert">
            {checkoutError}
          </p>
        )}
        <p style={{ color: "var(--ink-mute)", fontSize: "var(--fs-sm)", marginBottom: 0 }}>
          Paiement sécurisé via CinetPay (Orange Money, Wave, MTN MoMo). La
          facture HT + TVA arrive directement dans l'onglet Abonnement — ton
          funnel s'ouvre dès la confirmation du paiement.
        </p>
      </article>
    </div>
  );
}

// ── Onglet Abonnement (souscription en ligne + statut + factures) ─

function PlanPriceCard({
  plan,
  featured,
  busyPlan,
  onSubscribe,
}: {
  plan: B2bPlanCode;
  featured?: boolean;
  busyPlan: B2bPlanCode | null;
  onSubscribe: (plan: B2bPlanCode) => void;
}) {
  const info = B2B_PLAN_CATALOG[plan];
  return (
    <article className={`price-card${featured ? " price-card--featured" : ""}`}>
      {featured && <span className="price-card__flag">Le plus complet</span>}
      <h3>{info.label}</h3>
      <p className="price-card__amount">
        {formatFcfa(info.priceHt)}
        <span className="price-card__period"> HT /mois</span>
      </p>
      <p className="price-card__ht">
        + TVA 18&nbsp;% — soit {formatFcfa(computeTtc(info.priceHt))} TTC /mois
      </p>
      <p>{info.pitch}</p>
      <button
        type="button"
        className="btn btn--gold"
        onClick={() => onSubscribe(plan)}
        disabled={busyPlan !== null}
      >
        {busyPlan === plan ? "Ouverture du paiement…" : `Souscrire ${info.label}`}
      </button>
    </article>
  );
}

function SubscribePanel({
  title,
  busyPlan,
  checkoutError,
  onSubscribe,
}: {
  title: string;
  busyPlan: B2bPlanCode | null;
  checkoutError: string | null;
  onSubscribe: (plan: B2bPlanCode) => void;
}) {
  return (
    <>
      <h4>{title}</h4>
      <p style={{ color: "var(--ink-soft)" }}>
        Prix professionnels HT, TVA 18&nbsp;% en sus — paiement sécurisé via
        CinetPay (Orange Money, Wave, MTN MoMo), facture en bonne et due forme
        dans ton espace dès la confirmation.
      </p>
      <div className="card-grid card-grid--2">
        <PlanPriceCard plan="pro" busyPlan={busyPlan} onSubscribe={onSubscribe} />
        <PlanPriceCard plan="b2b_gold" featured busyPlan={busyPlan} onSubscribe={onSubscribe} />
      </div>
      {checkoutError && (
        <p className="form-error" role="alert">
          {checkoutError}
        </p>
      )}
    </>
  );
}

function InvoicesBlock({ invoices }: { invoices: InvoicesResult }) {
  return (
    <>
      <h4 style={{ marginTop: "var(--sp-lg)" }}>Les factures du lieu</h4>
      {!invoices.available ? (
        <p style={{ color: "var(--ink-soft)" }}>
          L'historique de facturation arrive ici. Besoin d'une facture tout de
          suite&nbsp;? Écris-nous.
        </p>
      ) : invoices.invoices.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>Aucune facture pour le moment.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Date</th>
                <th scope="col">Montant HT</th>
                <th scope="col">TVA</th>
                <th scope="col">TTC</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {invoices.invoices.map((inv) => (
                <tr key={inv.invoice_number}>
                  <td>{inv.invoice_number}</td>
                  <td>{formatDateFr(inv.issued_at)}</td>
                  <td>{typeof inv.price_ht === "number" ? formatFcfa(inv.price_ht) : "—"}</td>
                  <td>{typeof inv.tva_rate === "number" ? `${inv.tva_rate} %` : "—"}</td>
                  <td>{formatFcfa(inv.price_ttc)}</td>
                  <td>{inv.status === "paid" ? "Payée" : inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AbonnementTab({
  data,
  busyPlan,
  checkoutError,
  onSubscribe,
}: {
  data: DashboardData;
  busyPlan: B2bPlanCode | null;
  checkoutError: string | null;
  onSubscribe: (plan: B2bPlanCode) => void;
}) {
  const sub = data.subscription;
  return (
    <div className="card" role="tabpanel">
      <h3>L'abonnement de ton lieu</h3>
      {!sub.available ? (
        <Fallback
          reason={sub.reason === "error" ? "error" : "not_ready"}
          notReadyText="La souscription en ligne s'active ici dès que la facturation sera déployée. Recharge un peu plus tard."
        />
      ) : sub.status.kind === "active" ? (
        <>
          <div className="notice">
            <p>
              <span className="pill pill--gold">{b2bPlanLabel(sub.status.plan)} actif</span>
            </p>
            <p style={{ marginBottom: 0 }}>
              {sub.status.until
                ? `Ton abonnement court jusqu'au ${formatDateFr(sub.status.until)}. Rien n'est prélevé tout seul — on te fait signe avant l'échéance pour le renouvellement.`
                : "Ton abonnement est actif. Rien n'est prélevé tout seul — on te fait signe avant l'échéance."}
            </p>
          </div>
          <InvoicesBlock invoices={data.invoices} />
        </>
      ) : sub.status.kind === "grace" ? (
        <>
          <div className="notice">
            <p>
              <span className="pill pill--warm">Période de grâce</span>
            </p>
            <p style={{ marginBottom: 0 }}>
              {sub.status.until
                ? `L'échéance de ton ${b2bPlanLabel(sub.status.plan)} est passée, mais ton tableau de bord reste ouvert jusqu'au ${formatDateFr(sub.status.until)}. Renouvelle avant cette date pour ne rien perdre.`
                : `L'échéance de ton ${b2bPlanLabel(sub.status.plan)} est passée — tu es dans la fenêtre de grâce. Renouvelle pour ne rien perdre.`}
            </p>
          </div>
          <SubscribePanel
            title="Renouveler maintenant"
            busyPlan={busyPlan}
            checkoutError={checkoutError}
            onSubscribe={onSubscribe}
          />
          <InvoicesBlock invoices={data.invoices} />
        </>
      ) : sub.status.kind === "expired" ? (
        <>
          <div className="notice">
            <p>
              <span className="pill pill--danger">Abonnement expiré</span>
            </p>
            <p style={{ marginBottom: 0 }}>
              {sub.status.since
                ? `Ton ${b2bPlanLabel(sub.status.plan)} s'est arrêté le ${formatDateFr(sub.status.since)}. Repars quand tu veux — tout est en ligne.`
                : `Ton ${b2bPlanLabel(sub.status.plan)} est arrivé à échéance. Repars quand tu veux — tout est en ligne.`}
            </p>
          </div>
          <SubscribePanel
            title="Reprendre un abonnement"
            busyPlan={busyPlan}
            checkoutError={checkoutError}
            onSubscribe={onSubscribe}
          />
          <InvoicesBlock invoices={data.invoices} />
        </>
      ) : (
        <>
          <SubscribePanel
            title="Passe en Spawt Pro / Gold"
            busyPlan={busyPlan}
            checkoutError={checkoutError}
            onSubscribe={onSubscribe}
          />
          <InvoicesBlock invoices={data.invoices} />
        </>
      )}
    </div>
  );
}

// ── Rapport mensuel imprimable ────────────────────────────────────
// Section invisible à l'écran, seule visible en @media print (global.css).
// Bouton « Télécharger le rapport (PDF) » → window.print() : le navigateur
// fait le PDF, zéro dépendance.

function PrintReport({
  data,
  account,
  monthKeys,
  isGold,
}: {
  data: DashboardData;
  account: B2bAccount;
  monthKeys: string[];
  isGold: boolean;
}) {
  const currentKey = monthKeys[0];
  const current = data.monthly.available ? findMonthRow(data.monthly.rows, currentKey) : null;
  const resasCount = data.reservations.available
    ? countReservationsInMonth(data.reservations.rows, currentKey)
    : null;
  const funnelCurrent =
    isGold && data.funnel?.available ? findMonthRow(data.funnel.rows, currentKey) : null;

  return (
    <section className="print-report" aria-hidden="true">
      <header className="print-report__head">
        <span className="print-report__wordmark">SPAWT</span>
        <div>
          <h1>Rapport mensuel — {formatMonthFr(currentKey)}</h1>
          <p>
            {data.place ? data.place.name : "Ton lieu"}
            {data.place?.neighborhood ? ` · ${data.place.neighborhood}` : ""} — offre{" "}
            {isGold ? "Spawt Gold" : "Spawt Pro"} · édité le {formatDateFr(new Date())}
          </p>
        </div>
      </header>

      <h2>Le mois en bref</h2>
      <ul>
        <li>Spawts vérifiés&nbsp;: {formatStatValue(current?.spawts_verifies ?? null)}</li>
        <li>Avis reçus&nbsp;: {formatStatValue(current?.avis ?? null)}</li>
        <li>
          Note pondérée par stade&nbsp;:{" "}
          {formatStatValue(current?.note_moyenne_ponderee ?? null)} / 5
        </li>
        <li>Demandes de réservation&nbsp;: {formatStatValue(resasCount)}</li>
      </ul>
      <p className="print-report__note">
        « — » = moins de 3 événements sur le mois&nbsp;: l'agrégat n'est pas affiché pour
        protéger l'anonymat des spawters.
      </p>

      <h2>6 derniers mois</h2>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Spawts vérifiés</th>
            <th scope="col">Avis</th>
            <th scope="col">Note /5</th>
          </tr>
        </thead>
        <tbody>
          {monthKeys.map((key) => {
            const row = data.monthly.available ? findMonthRow(data.monthly.rows, key) : null;
            return (
              <tr key={key}>
                <td>{formatMonthFr(key)}</td>
                <td>{formatStatValue(row?.spawts_verifies ?? null)}</td>
                <td>{formatStatValue(row?.avis ?? null)}</td>
                <td>{formatStatValue(row?.note_moyenne_ponderee ?? null)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {isGold && (
        <>
          <h2>Funnel découverte → venue ({formatMonthFr(currentKey)})</h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Vues de fiche</th>
                <th scope="col">Sauvegardes</th>
                <th scope="col">Partages</th>
                <th scope="col">Spawts</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatStatValue(funnelCurrent?.views ?? null)}</td>
                <td>{formatStatValue(funnelCurrent?.saves ?? null)}</td>
                <td>{formatStatValue(funnelCurrent?.shares ?? null)}</td>
                <td>{formatStatValue(funnelCurrent?.spawts ?? null)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <footer className="print-report__foot">
        spawt.online — rapport généré depuis l'espace lieux · lieu&nbsp;
        {account.place_id.slice(0, 8)}
      </footer>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function ProDashboardPage() {
  usePageTitle("Tableau de bord — Espace lieux");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountState>({ kind: "loading" });
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>("apercu");
  const [busyPlan, setBusyPlan] = useState<B2bPlanCode | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Souscription en ligne — MÊME payment-checkout que /gold, plan B2B,
  // retour /pro/retour (poll de l'abonnement puis retour dashboard).
  const subscribe = async (plan: B2bPlanCode) => {
    if (busyPlan !== null || !session) return;
    setCheckoutError(null);
    setBusyPlan(plan);
    try {
      const { payment_url } = await startCheckout({
        plan,
        accessToken: session.access_token,
        returnUrl: `${window.location.origin}/pro/retour`,
      });
      redirectTo(payment_url);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          await signOut();
          navigate(`/connexion?next=${encodeURIComponent("/pro/dashboard")}`);
          return;
        }
        if (err.code === "not_b2b") {
          // Gate métier côté Edge : le rattachement lieu↔compte est un acte
          // de l'équipe — si le compte a été délié entre-temps, on l'explique.
          setCheckoutError(
            "Ton compte n'est pas (ou plus) relié à un lieu vérifié par l'équipe. Écris-nous pour finaliser le rattachement — le paiement se fera ensuite en ligne.",
          );
          return;
        }
        if (err.code === "already_active") {
          setCheckoutError(
            "Un abonnement est déjà actif pour ce lieu. Recharge la page pour voir son statut.",
          );
          return;
        }
        if (err.code === "provider_error") {
          setCheckoutError(
            "Notre partenaire de paiement ne répond pas. Rien n'a été débité — réessaie dans un instant.",
          );
          return;
        }
        if (err.code === "network_error") {
          setCheckoutError("Pas de réseau. Vérifie ta connexion et réessaie.");
          return;
        }
      }
      setCheckoutError("Un pépin de notre côté. Rien n'a été débité — réessaie.");
    } finally {
      setBusyPlan(null);
    }
  };

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const token = session.access_token;

    const expire = async () => {
      await signOut();
      navigate(`/connexion?next=${encodeURIComponent("/pro/dashboard")}`);
    };

    const load = async () => {
      try {
        const acc = await fetchB2bAccount(token);
        if (cancelled) return;
        if (!acc) {
          setAccount({ kind: "none" });
          return;
        }
        setAccount({ kind: "linked", account: acc });
        // Chargement parallèle ; le funnel n'est demandé QUE pour un compte
        // gold (pour un compte pro le gate SQL rendrait la vue vide).
        const [place, monthly, reservations, reviews, funnel, subscription, invoices] =
          await Promise.all([
            fetchPlaceInfo(acc.place_id, token),
            fetchPlaceMonthlyStats(acc.place_id, token),
            fetchReservationRequests(acc.place_id, token),
            fetchPlaceReviews(acc.place_id, token),
            isGoldAccount(acc)
              ? fetchPlaceFunnel(acc.place_id, token)
              : Promise.resolve<B2bDataResult<PlaceFunnelMonth> | null>(null),
            fetchB2bSubscription(token),
            fetchInvoices(token),
          ]);
        if (cancelled) return;
        const sessionExpired = [monthly, reservations, reviews, funnel, subscription].some(
          (r) => r !== null && !r.available && r.reason === "session_expired",
        );
        if (sessionExpired) {
          await expire();
          return;
        }
        setData({ place, monthly, reservations, reviews, funnel, subscription, invoices });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "session_expired") {
          await expire();
          return;
        }
        setAccount({ kind: "error" });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (account.kind === "loading" || (account.kind === "linked" && data === null)) {
    return (
      <section className="section container" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
      </section>
    );
  }

  if (account.kind === "none") {
    return (
      <section className="section">
        <div className="container container--narrow">
          <p className="section-kicker">Espace lieux</p>
          <h1>Ton lieu n'est pas encore relié</h1>
          <p>
            Ce numéro n'est rattaché à aucun lieu pour l'instant. Ton lieu doit
            d'abord être vérifié par l'équipe — c'est le seul passage obligé, et
            c'est vite réglé&nbsp;: écris-nous avec le nom de ton lieu et ton
            quartier, on fait le rattachement à la main (et on en profite pour
            te dire bonjour). Une fois relié, la souscription Spawt Pro / Gold
            se fait directement en ligne, ici même.
          </p>
          <a
            className="btn btn--accent"
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Relier mon lieu sur SPAWT")}`}
          >
            Écris-nous — {CONTACT_EMAIL}
          </a>
        </div>
      </section>
    );
  }

  if (account.kind === "error" || data === null) {
    return (
      <section className="section">
        <div className="container container--narrow">
          <p className="notice notice--danger" role="alert">
            Impossible de charger ton espace pour l'instant. Recharge la page ou
            réessaie plus tard.
          </p>
        </div>
      </section>
    );
  }

  const isGold = isGoldAccount(account.account);
  const monthKeys = lastMonthKeys(6);
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "apercu", label: "Aperçu" },
    { id: "reservations", label: "Réservations" },
    { id: "avis", label: "Avis" },
    { id: "audience", label: "Audience" },
    { id: "abonnement", label: "Abonnement" },
  ];

  return (
    <section className="section">
      <div className="container no-print">
        <p className="section-kicker">Espace lieux</p>
        <div className="dashboard-head">
          <div>
            <h1>{data.place ? data.place.name : "Ton tableau de bord"}</h1>
            <p style={{ color: "var(--ink-soft)" }}>
              <span className={`pill ${isGold ? "pill--gold" : "pill--warm"}`}>
                {isGold ? "Spawt Gold" : "Spawt Pro"}
              </span>{" "}
              {data.place?.neighborhood ? `${data.place.neighborhood} · ` : ""}
              lieu <code>{account.account.place_id.slice(0, 8)}</code>
            </p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => window.print()}>
            Télécharger le rapport (PDF)
          </button>
        </div>

        <div className="tabs" role="tablist" aria-label="Sections du tableau de bord">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "apercu" && <ApercuTab data={data} monthKeys={monthKeys} isGold={isGold} />}
        {tab === "reservations" && <ReservationsTab result={data.reservations} />}
        {tab === "avis" && <AvisTab data={data} currentKey={monthKeys[0]} />}
        {tab === "audience" &&
          (isGold && data.funnel !== null ? (
            <AudienceGoldTab funnel={data.funnel} monthKeys={monthKeys} />
          ) : (
            <UpsellGoldTab
              busyPlan={busyPlan}
              checkoutError={checkoutError}
              onSubscribe={(plan) => void subscribe(plan)}
            />
          ))}
        {tab === "abonnement" && (
          <AbonnementTab
            data={data}
            busyPlan={busyPlan}
            checkoutError={checkoutError}
            onSubscribe={(plan) => void subscribe(plan)}
          />
        )}
      </div>

      <PrintReport data={data} account={account.account} monthKeys={monthKeys} isGold={isGold} />
    </section>
  );
}
