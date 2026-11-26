import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PublicPlaceSheet } from '../components/PublicPlaceSheet';
import { parseMenu, parsePlaceContact, parsePractical, parseReviewStats } from '../lib/place-details';
import type { PublicPlace } from '../lib/public-places';

const place: PublicPlace = { id: 'place1', name: 'Table du test', lat: 5.29, lng: -3.99,
  neighborhood: 'Marcory', city: 'Abidjan', descriptive_address: 'Rue du Canal', cuisine: ['francaise'] };
const mount = (value = place) => render(<PublicPlaceSheet key={value.id} place={value} onClose={() => {}} detailRef={createRef<HTMLElement>()}/>);
afterEach(() => { vi.unstubAllGlobals(); });

function tables(data: Record<string, unknown>) {
  return vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input), table = url.pathname.split('/').pop()!;
    expect(url.searchParams.get(table === 'places' ? 'id' : 'place_id')).toBe('eq.place1');
    if (!(table in data)) return new Response('unavailable', { status: 503 });
    return new Response(JSON.stringify(data[table]));
  }));
}

describe('Fiche publique de lieu', () => {
  it('conserve les contact et horaires valides sans déduire de fermeture pour les jours absents', () => {
    expect(parsePlaceContact({phone: '07 01 02 03 04', whatsapp: '+225 01 02 03 04 05', avg_ticket_xof: 0, price_tier: 4,
      menu_urls: ['javascript:alert(1)', 'https://example.ci/menu'], cover_photo_url: 'https://other.ci/p.png',
      hours: {mon: [], tue: [{open: '10:00', close:'02:00'}], wed: [{open:'24:50',close:'12:00'}]} }))
      .toMatchObject({phone: '+2250701020304', whatsapp: '+2250102030405', ticket: null, tier: null, menus: ['https://example.ci/menu'],
        cover: null, hours: [{day: 'Lundi', intervals: []}, {day:'Mardi',intervals:[{open:'10:00',close:'02:00'}]}]});
    expect(parsePractical({website_url:'https://name:pass@site.ci/', contact_email:'test@site.ci?cc=else@site.ci',
      google_maps_url:'https://maps.app.goo.gl.bad.example/test', social_links:[{label:'social',url:'data:x'}]}))
      .toMatchObject({website:null, email:null, maps:null, socials:[]});
    expect(parseMenu([{id:'1', name:'Autre', place_id: 'elsewhere', is_published:true}, {id:'2', name:'Brouillon', place_id:place.id, is_published:false}], place.id)).toEqual([]);
    expect(parseReviewStats({review_count:0,histogram:[0,0,0,0,0]})).toBeNull();
    expect(parseReviewStats({review_count:3,cuisine_avg:0,cadre_avg:4.5,histogram:[1,5,0,0,0]})).toMatchObject({ratings:[{name:'Cadre',value:4.5}],histogram:null});
  });

  it('présente ticket, plats à leur prix daté, horaires de nuit, itinéraire et services sourcés', async () => {
    tables({
      places:[{id:place.id,phone:'+2250701020304',avg_ticket_xof:15000,hours:{fri:[{open:'19:00',close:'02:00'}]}}],
      public_place_practical:[{place_id:place.id,website_url:'https://example.ci/',services:['Terrasse'],payment_methods:['Espèces'],
        sources:[{url:'https://example.ci/contact',label:'Page du lieu',checked_on:'2026-11-26',fields:['services']}]}],
      public_menu_items:[{id:'1',place_id:place.id,is_published:true,name:'Eggs Benedict',price_xof:7000,source_url:'https://example.ci/brunch-menu/',observed_on:'2026-10-22'}],
      public_place_review_stats:[{place_id:place.id,review_count:2,cuisine_avg:4.5,cadre_avg:4,service_avg:5,histogram:[0,0,0,1,1]}],
    });
    mount();
    expect(await screen.findByRole('link',{name:'Appeler'})).toHaveAttribute('href','tel:+2250701020304');
    expect(screen.getByRole('link',{name:'Itinéraire'})).toHaveAttribute('href','https://www.google.com/maps/dir/?api=1&destination=5.29%2C-3.99');
    fireEvent.click(screen.getByText('Horaires'));
    expect(screen.getByText('19:00 – 02:00 (lendemain)')).toBeVisible();
    fireEvent.click(screen.getByText('Carte brunch'));
    expect(screen.getByText('Eggs Benedict')).toBeVisible();
    expect(screen.getByText(/Relevé le 22 octobre 2026/)).toBeVisible();
    expect(screen.getByText(/Ticket moyen indicatif/)).toHaveTextContent(/15\s000/);
    expect(screen.getByText('Terrasse')).toBeVisible();
    fireEvent.click(screen.getByText('Avis de la Bande'));
    expect(screen.getByText('Cuisine · 4,5 / 5')).toBeVisible();
    expect(screen.getByLabelText('Nombre d’avis à 5 sur 5')).toHaveAttribute('value','1');
    fireEvent.click(screen.getByText('Sources du lieu'));
    expect(screen.getByRole('link',{name:'Page du lieu'})).toHaveAttribute('href','https://example.ci/contact');
  });

  it('garde les données accessibles après une panne isolée et réessaie sans inventer un ticket ou une adresse GPS', async () => {
    const data: Record<string, unknown> = { places: [{id:place.id}], public_menu_items:[], public_place_review_stats:[] };
    tables(data);
    mount({...place, lat:null, lng:null, descriptive_address:''});
    expect(await screen.findByRole('button',{name:'Réessayer'})).toBeVisible();
    expect(screen.getByRole('heading',{name:place.name})).toBeVisible();
    expect(screen.queryByRole('link',{name:'Itinéraire'})).toBeNull();
    expect(screen.queryByText('Budget')).toBeNull();
    expect(screen.queryByText('À la carte')).toBeNull();
    data.public_place_practical = [];
    fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));
    await waitFor(() => expect(screen.queryByRole('button',{name:'Réessayer'})).toBeNull());
  });

  it('partage un lien direct vers le lieu même sans API de partage ou de presse-papiers', async () => {
    tables({ places: [], public_place_review_stats: [], public_place_practical: [], public_menu_items: [] });
    mount();
    fireEvent.click(screen.getByRole('button',{name:'Partager la fiche'}));
    expect(await screen.findByRole('textbox',{name:'Lien de la fiche'})).toHaveValue(window.location.origin + '/carte?lieu=place1');
  });

  it('affiche les conseils et la FAQ du profil publié sans répéter la présentation ou les passages identiques', async () => {
    const intro = 'Une table à Marcory.';
    tables({ public_menu_items: [], public_place_review_stats: [],
      places: [{id:place.id, editorial_profile:{identity:intro, verified_on:'2026-11-26', sections:[
        {title:'Présentation',body:intro}, {title:'Venir en groupe',body:'Réserver avant de venir.'},
        {title:'FAQ',body:'Le lieu ouvre le dimanche.'}, {title:'Doublon',body:' réserver  avant de venir. '}, {title:'Brouillon',body:' '}]}}],
      public_place_practical:[{place_id:place.id, official_description:intro}] });
    mount();
    expect(await screen.findByRole('heading',{name:'FAQ'})).toBeVisible();
    expect(screen.getAllByText(intro)).toHaveLength(1);
    expect(screen.getByRole('heading',{name:'Venir en groupe'})).toBeVisible();
    expect(screen.getByText('Rédaction SPAWT · Vérifié le 26 novembre 2026')).toBeVisible();
    expect(screen.queryByRole('heading',{name:/Doublon|Brouillon|Présentation/})).toBeNull();
    expect(parsePlaceContact({editorial_profile:{identity:intro,verified_on:'2026-02-30',sections:[]}}).editorial).toBeNull();
  });
});
