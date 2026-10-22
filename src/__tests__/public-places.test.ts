import {describe,it,expect} from 'vitest';
import {parsePublicPlaces} from '../lib/public-places';
const place={id:'1',name:'Kaiten',is_published:true,city_code:'abidjan',lat:5.29,lng:-3.99,cuisine:['Japonais'],internal_notes:'PRIVATE',owner_email:'PRIVATE'};
describe('Catalogue public',()=>{
 it('ne conserve que lieux publiés Abidjan',()=>{expect(parsePublicPlaces([place,{...place,id:'2',is_published:false},{...place,id:'3',city_code:'douala'}])).toHaveLength(1);});
 it('ne propage aucun champ privé ni note',()=>{const p=parsePublicPlaces([place])[0];expect(p).not.toHaveProperty('internal_notes');expect(p).not.toHaveProperty('owner_email');expect(p).not.toHaveProperty('rating');});
 it('garde fiche mais refuse coordonnées invalides',()=>{expect(parsePublicPlaces([{...place,lat:999,lng:null}])[0]).toMatchObject({lat:null,lng:null});});
 it('refuse réponse non structurée',()=>expect(()=>parsePublicPlaces({error:'oops'})).toThrow());
});
