'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { APARTMENT_ASSAINISSEMENT_PRICE, buildQuoteSuggestion, HOUSE_ASSAINISSEMENT_PRICE, HOUSE_SIZE_TIERS, QuoteSuggestion, splitDiagnostics } from '@/lib/quote-assistant'
import { ALACARTE_ITEM_IDS, ALaCarteItemId, APARTMENT_DPE_ONLY_PRICES, ERP_OPTION_PRICE, getALaCartePrice, getALaCarteUnitPrice, getPackPrice, HOUSE_DPE_ONLY_PRICES, isPlombYear, PackPurpose } from '@/lib/property-pricing'
import { supabase } from '@/lib/supabase'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/pro-signup'
import { INTERNAL_PRICING, type InternalPrice } from '@/lib/internal-pricing'

type Dossier={id:string;dossier_name:string;account_id?:string|null;purpose?:string|null;diagnostics?:string[]|string|null;property_address?:string|null;property_type?:string|null;property_size?:string|number|null;surface?:string|number|null;rooms?:string|number|null;dependencies?:string|null;contact_name?:string|null;contact_phone?:string|null;contact_email?:string|null;construction_year?:number|null;property_id?:string|null}
type Account={id:string;company_name:string|null;first_name:string|null;last_name:string|null;account_type:string|null;validation_status:string|null}
// Remise partenaire -10 % : uniquement pour un compte professionnel (types
// de lib/pro-signup.ts) VALIDÉ par ARIA dans /admin/comptes-pro. Même
// arrondi que /assistant (Math.ceil sur le TTC).
const PRO_ACCOUNT_TYPES=new Set(ACCOUNT_TYPE_OPTIONS.map(o=>o.id))
const PRO_DISCOUNT_RATE=0.1
const accountName=(a:Account)=>a.company_name||[a.first_name,a.last_name].filter(Boolean).join(' ')||'Compte sans nom'
type Quote={id:string;quote_number:string;status:string;total_ht:number;total_vat:number;total_ttc:number;created_at:string;dossier_id:string}
type PropertyType='apartment'|'house'
type Measurement='none'|'boutin'|'attestation'
type FormState={dossier_id:string;propertyType:PropertyType;sizeKey:string;packCount:number;measurement:Measurement;assainissement:boolean;notes:string}

const apartmentLabels=['T1','T2','T3','T4','T5']
// Dérivé de lib/quote-assistant.ts (HOUSE_SIZE_TIERS) plutôt que dupliqué ici,
// pour que la grille tarifaire et la suggestion IA partagent les mêmes 7
// tranches de surface maison et ne puissent plus diverger.
const houseLabels=HOUSE_SIZE_TIERS.map(tier=>tier.label)
// Tranche partagée par la grille principale ET par la Loi Boutin : une seule
// source de vérité pour "cette surface nécessite un devis personnalisé",
// dérivée de houseLabels plutôt que dupliquée en dur à deux endroits.
const HOUSE_QUOTE_ON_REQUEST_INDEX=houseLabels.length-1
const QUOTE_ON_REQUEST_MESSAGE='Ce type de bien nécessite une évaluation personnalisée — nous vous recontactons sous 24h avec un devis adapté.'
const euro=(n:number)=>n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})
const dateFr=(v:string)=>new Date(v).toLocaleDateString('fr-FR')
const quoteStatus=(s:string)=>({draft:'Brouillon',sent:'Envoyé',accepted:'Accepté'} as Record<string,string>)[s]||s
// "surface" = Carrez/Boutin pour un appartement, Boutin/Mesurage pour une
// maison : un seul item, un seul prix, pas d'objet vente/location en mode
// "à la carte".
const alaCarteItemLabel=(id:ALaCarteItemId,propertyType:PropertyType):string=>{
 switch(id){
  case 'dpe': return 'DPE'
  case 'erp': return 'ERP'
  case 'surface': return propertyType==='house'?'Boutin/Mesurage':'Carrez/Boutin'
  case 'plomb': return 'Plomb (CREP)'
  case 'amiante': return 'Amiante'
  case 'elec': return 'Électricité'
  case 'gaz': return 'Gaz'
  case 'termites': return 'Termites'
 }
}

type BienType='apartment'|'house'|'local'|'immeuble'|'travaux'
const bienTypeFromProperty=(raw?:string|null):BienType|null=>{const v=String(raw||'').toLowerCase();if(v==='commercial'||v==='local')return 'local';if(v==='building'||v==='immeuble')return 'immeuble';if(v==='house')return 'house';if(v==='apartment')return 'apartment';return null}
// Le type de bien vit dans public.properties (dossiers.property_id). Lecture
// séparée : si elle échoue, la liste des dossiers reste affichée sans type.
const withPropertyTypes=async<T extends {data:any[]|null}>(r:T):Promise<T>=>{const ids=Array.from(new Set((r.data||[]).map((x:any)=>x.property_id).filter(Boolean)));if(!ids.length)return r;const {data}=await supabase.from('properties').select('id,property_type').in('id',ids);const m=new Map((data||[]).map((p:any)=>[p.id,p.property_type]));return {...r,data:(r.data||[]).map((x:any)=>({...x,property_type:x.property_type??m.get(x.property_id)??null}))}}
export default function DevisPage(){
 const router=useRouter();const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [dossiers,setDossiers]=useState<Dossier[]>([]);const [quotes,setQuotes]=useState<Quote[]>([])
 const [suggestion,setSuggestion]=useState<QuoteSuggestion|null>(null)
 const [form,setForm]=useState<FormState>({dossier_id:'',propertyType:'apartment',sizeKey:'0',packCount:2,measurement:'none',assainissement:false,notes:''})
 // Mission minimale (DPE seul) : quand cochée, remplace le sélecteur "Nombre
 // de diagnostics" par la logique DPE seul / DPE + attestation de surface.
 const [missionMinimale,setMissionMinimale]=useState(false)
 // Le DPE a besoin d'une surface pour être calculé. En mission minimale :
 // "Non" -> le diagnostic de surface redevient obligatoire, prix = pack 2
 // existant. "Oui" -> DPE seul, prix = grille DPE seul, ERP optionnel.
 const [hasSurfaceAttestation,setHasSurfaceAttestation]=useState(false)
 // ERP en option (+25€), uniquement pertinent en mission minimale quand le
 // client a déjà une attestation de surface (1 seul diagnostic facturé).
 const [erpOptionChecked,setErpOptionChecked]=useState(false)
 // Diagnostics à la carte : mode mutuellement exclusif avec "Mission
 // minimale" (cocher l'un décoche l'autre). Sélection libre parmi 8
 // diagnostics ; 1 seul coché -> prix unitaire, 2 ou plus -> prix du pack
 // existant correspondant au nombre coché.
 const [alaCarte,setALaCarte]=useState(false)
 const [alaCarteChecked,setALaCarteChecked]=useState<Set<ALaCarteItemId>>(new Set())
 const toggleALaCarteItem=(id:ALaCarteItemId)=>setALaCarteChecked(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next})
 const [accounts,setAccounts]=useState<Record<string,Account>>({});const [proOverride,setProOverride]=useState<{dossier:string;on:boolean}|null>(null)
 const [extras,setExtras]=useState<(InternalPrice&{qty:number})[]>([]);
 // Types de bien hors grille publique (tarifs réservés ARIA, lib/internal-pricing.ts)
 const [bienType,setBienType]=useState<BienType>('apartment')
 const [at,setAt]=useState({kind:'travaux',tranche:0,amiante:true,plomb:false,termites:false})
 const [lp,setLp]=useState({op:'vente',permis:'A',tranche:0,amiante:true,plomb:false,termites:false})
 const [im,setIm]=useState({etages:1,dta:true,plomb:false,termites:false,cages:0,lots:0})
 const special=bienType==='local'||bienType==='immeuble'||bienType==='travaux'
 const changeBienType=(v:BienType)=>{setBienType(v);if(v==='apartment'||v==='house'){setForm(f=>({...f,propertyType:v,packCount:2,sizeKey:'0',measurement:'none'}));setExtrasOnly(false)}setHasSurfaceAttestation(false);setErpOptionChecked(false);setALaCarteChecked(new Set())}
 // Type de bien repris du dossier (properties.property_type) à chaque
 // changement de dossier ; reste modifiable à la main ensuite.
 const [typedFor,setTypedFor]=useState('')
 useEffect(()=>{if(!form.dossier_id||typedFor===form.dossier_id)return;const d=dossiers.find(x=>x.id===form.dossier_id);if(!d)return;setTypedFor(form.dossier_id);const t=bienTypeFromProperty(d.property_type);if(t&&t!==bienType)changeBienType(t);if(t==='local'){const op=d.purpose==='rental'?'location':d.purpose==='works'||d.purpose==='demolition'?'travaux':'vente';const y=Number(d.construction_year);setLp(x=>({...x,op,permis:Number.isFinite(y)&&y>0?(y<1997?'A':'P'):x.permis}))}},[form.dossier_id,dossiers])
const [extrasOnly,setExtrasOnly]=useState(false);const [extraRef,setExtraRef]=useState('')
 const [promoCode,setPromoCode]=useState('');const [promo,setPromo]=useState<{code:string;label:string|null;discount_type:'percent'|'fixed';discount_value:number}|null>(null);const [promoError,setPromoError]=useState('')
 const applyPromo=async()=>{setPromoError('');const code=promoCode.trim().toUpperCase();if(!code){setPromoError('Entre un code.');return}const escaped=code.replace(/[%_]/g,'\\$&');const {data,error}=await supabase.from('promo_codes').select('code,label,discount_type,discount_value').ilike('code',escaped).maybeSingle();if(error||!data){setPromoError('Code invalide ou expiré.');setPromo(null);return}setPromo(data as any)}
 const removePromo=()=>{setPromo(null);setPromoCode('');setPromoError('')}
 const load=async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}const [d,q,a]=await Promise.all([supabase.from('dossiers').select('*').order('created_at',{ascending:false}).then(withPropertyTypes),supabase.from('quotes').select('id,quote_number,status,total_ht,total_vat,total_ttc,created_at,dossier_id').order('created_at',{ascending:false}).limit(20),supabase.from('client_accounts').select('id,company_name,first_name,last_name,account_type,validation_status')]);if(a.data){const m:Record<string,Account>={};(a.data as Account[]).forEach(x=>{m[x.id]=x});setAccounts(m)}if(d.data){const params=new URLSearchParams(window.location.search),requested=params.get('dossier');if(requested&&params.get('libre')==='1'&&d.data?.some(item=>item.id===requested)){window.history.replaceState(null,'','/devis');void createFreeQuote(requested)}setDossiers(d.data as Dossier[]);setForm(f=>({...f,dossier_id:f.dossier_id||d.data?.find(item=>item.id===requested)?.id||d.data?.[0]?.id||''}))}if(q.data)setQuotes(q.data as Quote[]);setLoading(false)}
 useEffect(()=>{void load()},[])
 const sizeLabels=form.propertyType==='apartment'?apartmentLabels:houseLabels
 const sizeIndex=Math.max(0,Math.min(sizeLabels.length-1,Number(form.sizeKey)||0)),allowedPacks=form.propertyType==='apartment'?[2,3,4,5,6,7]:[2,3,4,5,6],effectivePack=allowedPacks.includes(form.packCount)?form.packCount:allowedPacks[0]
 // Au-delà du maximum existant (7 appartement / 6 maison), comportement
 // actuel de dépassement de pack : "sur devis", comme pour houseOver250.
 const alaCarteMaxPack=form.propertyType==='apartment'?7:6
 // À la carte + DPE seul coché : même seuil "DPE seul" que la mission
 // minimale, atteint par un autre chemin. Réutilise la case "Le client
 // possède déjà une attestation de surface" déjà en place pour la mission
 // minimale (ci-dessous) plutôt qu'un nouveau composant. Dérivé (pas de case
 // cochée pour le client) : par défaut (décochée = "Non"), le diagnostic de
 // surface est ajouté au calcul, comportement prudent identique à la mission
 // minimale existante.
 const alaCarteAskSurfaceAttestation=alaCarte&&alaCarteChecked.size===1&&alaCarteChecked.has('dpe')
 const alaCarteEffectiveChecked=alaCarteAskSurfaceAttestation&&!hasSurfaceAttestation?new Set<ALaCarteItemId>([...alaCarteChecked,'surface']):alaCarteChecked
 const alaCarteOverflow=alaCarte&&alaCarteEffectiveChecked.size>alaCarteMaxPack
 const quoteOnRequest=(form.propertyType==='house'&&sizeIndex===HOUSE_QUOTE_ON_REQUEST_INDEX)||alaCarteOverflow
 const selectedDossier=dossiers.find(d=>d.id===form.dossier_id)
 const hasContactInfo=!!(selectedDossier?.contact_phone||selectedDossier?.contact_email)
 // Objet du dossier (Vente/Location) : source de la remise -10% sur le pack
 // en location, calculée par lib/property-pricing.ts (seule source commune
 // avec /assistant). Aucun dossier sélectionné, ou objet autre que
 // vente/location (travaux, autre) : prix vente par défaut, non remisé.
 const packPurpose:PackPurpose=selectedDossier?.purpose==='rental'?'rental':'sale'
 // Plomb dans la mission : bien d'avant 1949 ou plomb coché sur le dossier.
 const dossierHasPlomb=isPlombYear((selectedDossier as {construction_year?:number|null}|undefined)?.construction_year)||splitDiagnostics(selectedDossier?.diagnostics??null).some(x=>/plomb/i.test(x))
 // Mission minimale : "Oui" (attestation déjà fournie) -> DPE seul, grille
 // dédiée, ERP en option (+25€) si coché. "Non" -> DPE + diagnostic de
 // surface, réutilise directement le pack 2 existant (aucun nouveau calcul),
 // ERP inclus gratuitement. Hors mission minimale (pack complet) : comme
 // avant la mission minimale, le sélecteur "Nombre de diagnostics" pilote le
 // prix et le mesurage maison reste une simple option facultative.
 const dpeOnlyPrice=form.propertyType==='apartment'?APARTMENT_DPE_ONLY_PRICES[sizeIndex]:HOUSE_DPE_ONLY_PRICES[sizeIndex]??null
 const missionBase=hasSurfaceAttestation?(dpeOnlyPrice??0):(getPackPrice(form.propertyType,2,sizeIndex,packPurpose)??0)
 // ERP inclus gratuitement dès que 2 diagnostics ou plus sont facturés (pack
 // complet, ou mission minimale + "Non") ; en option (+25€) uniquement pour
 // une mission minimale à 1 seul diagnostic facturé (DPE seul).
 const erpFree=!alaCarte&&!(missionMinimale&&hasSurfaceAttestation)
 const erpOptionPrice=!alaCarte&&missionMinimale&&hasSurfaceAttestation&&erpOptionChecked?ERP_OPTION_PRICE:0
 // Diagnostics à la carte : 1 seul coché -> prix unitaire, 2 ou plus -> prix
 // du pack existant correspondant au nombre coché (peu importe lesquels),
 // même source lib/property-pricing.ts que /assistant.
 const alaCartePrice=alaCarte&&!quoteOnRequest?getALaCartePrice(form.propertyType,Array.from(alaCarteEffectiveChecked),sizeIndex)??0:0
 const base=quoteOnRequest?0:alaCarte?alaCartePrice:(missionMinimale?missionBase:getPackPrice(form.propertyType,effectivePack,sizeIndex,packPurpose,dossierHasPlomb)??0),measurement=!missionMinimale&&!alaCarte&&form.propertyType==='house'&&form.measurement!=='none'&&!quoteOnRequest?HOUSE_SIZE_TIERS[sizeIndex]?.measurementPrice||0:0,assainissement=form.assainissement?(form.propertyType==='apartment'?APARTMENT_ASSAINISSEMENT_PRICE:HOUSE_ASSAINISSEMENT_PRICE):0
 const selectedAccount=(()=>{const d=dossiers.find(x=>x.id===form.dossier_id);return d?.account_id?accounts[d.account_id]||null:null})()
 const accountIsPro=!!selectedAccount&&PRO_ACCOUNT_TYPES.has(String(selectedAccount.account_type||''))
 const accountIsValidatedPro=accountIsPro&&selectedAccount?.validation_status==='validated'
 const proApplied=accountIsValidatedPro&&(proOverride?.dossier===form.dossier_id?proOverride.on:true)
 const subtotal=base+measurement+erpOptionPrice+assainissement
 const proDiscount=!quoteOnRequest&&proApplied?subtotal-Math.ceil(subtotal*(1-PRO_DISCOUNT_RATE)):0
 const proStatusText=!selectedAccount?'Dossier sans compte rattaché : tarif particulier.':!accountIsPro?`${accountName(selectedAccount)} : compte particulier, pas de remise pro.`:selectedAccount.validation_status==='validated'?`${accountName(selectedAccount)} : compte pro validé.`:`${accountName(selectedAccount)} : compte pro ${selectedAccount.validation_status==='pending'?'en attente de validation':'refusé'} — valide-le dans Comptes pro pour appliquer la remise.`
 const promoDiscount=!proApplied&&!quoteOnRequest&&promo?(promo.discount_type==='percent'?Math.round((base+measurement+erpOptionPrice+assainissement)*promo.discount_value)/100:Math.min(promo.discount_value,base+measurement+erpOptionPrice+assainissement)):0
 // Prestations réservées ARIA (lib/internal-pricing.ts), hors remise pro. « extrasOnly » : devis sans pack (mission avant travaux seule).
 const findRef=(ref:string)=>INTERNAL_PRICING.flatMap(c=>c.items).find(i=>i.ref===ref)
 const TR=['30','60','90','150','300','550','850','1200']
 const autoExtras=(()=>{const out:(InternalPrice&{qty:number})[]=[];const add=(ref:string,qty=1)=>{const it=findRef(ref);if(it&&qty>0)out.push({...it,qty})}
  if(bienType==='local'){const t=TR[lp.tranche];if(lp.op==='vente')add(`VP-${lp.permis}${t}`);if(lp.op==='location')add(`LP-${lp.permis}${t}`);if(lp.op==='cession')add(`CF-${lp.permis}${t}`);if(lp.op==='cva')add(`CVA-${t}`);if(lp.op==='travaux'){if(lp.amiante)add(`RAAT-${t}`);if(lp.plomb)add(`PBAT-${t}`);if(lp.termites)add(`TAT-${t}`)}}
  if(bienType==='immeuble'){if(im.dta)add(`DTA-R${im.etages}`);if(im.plomb)add(`PPC-R${im.etages}`);if(im.termites)add(`TPC-R${im.etages}`);add('ASS-IM',im.cages);add('DPEC-LOT',Math.min(50,im.lots))}
  if(bienType==='travaux'){const t=TR[at.tranche];const dem=at.kind==='demolition';const lab=(x:InternalPrice&{qty:number})=>dem?{...x,label:x.label.replace('avant travaux','avant démolition')}:x;const before=out.length;if(at.amiante)add(`RAAT-${t}`);if(at.plomb)add(`PBAT-${t}`);if(at.termites)add(`TAT-${t}`);for(let k=before;k<out.length;k++)out[k]=lab(out[k])}
  return out})()
 const allExtras=[...autoExtras,...extras]
 const extrasOnlyEff=special||extrasOnly
 const autoMissing=bienType==='local'&&lp.op==='cession'&&lp.tranche>5?'Cession / reprise de bail : grille jusqu’à 550 m², au-delà sur devis.':bienType==='local'&&lp.op==='location'&&lp.permis==='P'&&lp.tranche===6?'Tarif à vérifier pour cette tranche (non sélectionnable).':''
 const extrasTtc=allExtras.reduce((s,x)=>s+x.ttc*x.qty,0)
 const coreTtc=extrasOnlyEff||quoteOnRequest?0:Math.max(0,base+measurement+erpOptionPrice+assainissement-proDiscount-promoDiscount)
 const onRequest=quoteOnRequest&&!extrasOnlyEff
 const totalTtc=onRequest?0:coreTtc+extrasTtc,totalHt=onRequest?0:Math.round(totalTtc/1.2*100)/100,vat=onRequest?0:Math.round((totalTtc-totalHt)*100)/100
 const extraLines=allExtras.filter(x=>!x.toVerify).map(x=>({label:`${x.label}${x.unit&&x.qty>1?` – ${x.qty} × ${euro(x.ttc)} par ${x.unit}`:x.unit?` – par ${x.unit}`:''}${x.detail?` (${x.detail})`:''}`,ttc:x.ttc*x.qty}))
 const lines=useMemo(()=>{if(extrasOnlyEff)return extraLines.length?extraLines:[{label:'Aucune prestation sélectionnée',ttc:0}];if(quoteOnRequest)return [{label:QUOTE_ON_REQUEST_MESSAGE,ttc:0}];const alaCarteLabel=`Diagnostics à la carte : ${Array.from(alaCarteEffectiveChecked).map(id=>alaCarteItemLabel(id,form.propertyType)).join(', ')||'aucun sélectionné'}`;const out=[alaCarte?{label:alaCarteLabel,ttc:base}:missionMinimale?{label:hasSurfaceAttestation?'Mission minimale : DPE seul':'Mission minimale : DPE + attestation de surface (pack 2)',ttc:base}:{label:`Pack ${effectivePack} diagnostics – ${form.propertyType==='apartment'?apartmentLabels[sizeIndex]:houseLabels[sizeIndex]}`,ttc:base}];if(erpFree)out.push({label:missionMinimale?'ERP (état des risques et pollutions) — 25 € offert':'ERP (état des risques et pollutions) — inclus dans le pack',ttc:0});if(erpOptionPrice>0)out.push({label:'ERP (état des risques et pollutions) — option',ttc:erpOptionPrice});if(!missionMinimale&&!alaCarte&&form.propertyType==='house'&&form.measurement==='boutin')out.push({label:'Mesurage (surface habitable)',ttc:measurement});if(!missionMinimale&&!alaCarte&&form.propertyType==='house'&&form.measurement==='attestation')out.push({label:'Attestation de mesurage',ttc:measurement});if(form.assainissement)out.push({label:'Contrôle de l’assainissement',ttc:assainissement});if(proApplied&&proDiscount>0)out.push({label:`Remise partenaire -10 %${selectedAccount?' – '+accountName(selectedAccount):''}`,ttc:-proDiscount});if(promo&&!proApplied)out.push({label:`Code pro ${promo.code}${promo.label?' – '+promo.label:''}`,ttc:-promoDiscount});return [...out,...extraLines]},[extraLines.map(l=>l.label+l.ttc).join('|'),extrasOnlyEff,base,measurement,erpFree,erpOptionPrice,assainissement,missionMinimale,alaCarte,alaCarteEffectiveChecked,hasSurfaceAttestation,form.measurement,form.assainissement,form.propertyType,sizeIndex,effectivePack,promo,promoDiscount,proApplied,proDiscount,selectedAccount,quoteOnRequest])
 const analyzeDossier=()=>{setError('');const dossier=dossiers.find(item=>item.id===form.dossier_id);if(!dossier){setError('Choisis un dossier avant de lancer l’analyse.');return}if(special){setError('Proposition automatique disponible pour une maison ou un appartement uniquement : pour ce type de bien, choisis directement les options ci-dessous.');return}setSuggestion(buildQuoteSuggestion(dossier))}
 const applySuggestion=()=>{if(!suggestion)return;const trace=[suggestion.diagnostics.length?`Missions détectées : ${suggestion.diagnostics.join(', ')}.`:'',...suggestion.warnings].filter(Boolean).join(' ');setForm(f=>({...f,propertyType:suggestion.propertyType,sizeKey:suggestion.sizeKey,packCount:suggestion.packCount,measurement:!suggestion.missionMinimale&&suggestion.propertyType==='house'&&suggestion.boutin?'boutin':'none',assainissement:suggestion.assainissement,notes:[f.notes,trace].filter(Boolean).join('\n')}));setMissionMinimale(suggestion.missionMinimale);if(!suggestion.missionMinimale)setErpOptionChecked(false);setSuggestion(null)}
 const createQuoteNumber=async()=>{const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,prefix=`DEV-${stamp}-`;const {data}=await supabase.from('quotes').select('quote_number').like('quote_number',`${prefix}%`).order('quote_number',{ascending:false}).limit(1),last=data?.[0]?.quote_number||'',n=last?Number(last.slice(-3))+1:1;return `${prefix}${String(n).padStart(3,'0')}`}
 const quoteKind=quoteOnRequest?(alaCarteOverflow?'alacarte_sur_devis':`pack_${effectivePack}_sur_devis`):alaCarte?`alacarte_${alaCarteEffectiveChecked.size}`:missionMinimale?(hasSurfaceAttestation?'mission_minimale_dpe_seul':'mission_minimale_pack2'):`pack_${effectivePack}`
 // Devis libre : crée un brouillon vide pour le dossier choisi, puis ouvre
 // l'éditeur (/devis/[id]) où chaque ligne, quantité et prix se saisit à la main.
 const createFreeQuote=async(dossierId=form.dossier_id)=>{setError('');if(!dossierId){router.push('/dossiers/nouveau?libre=1');return}setSaving(true);const quoteNumber=await createQuoteNumber();const {data:q,error:qError}=await supabase.from('quotes').insert({dossier_id:dossierId,quote_number:quoteNumber,status:'draft',total_ht:0,total_vat:0,total_ttc:0,quote_kind:'libre',notes:null}).select('id').single();if(qError||!q){setError(qError?.message||'Impossible de créer le devis.');setSaving(false);return}await supabase.from('quote_lines').insert({quote_id:q.id,label:'Prestation',quantity:1,unit_ttc:0,total_ttc:0,sort_order:0});setSaving(false);router.push(`/devis/${q.id}`)}
 const save=async()=>{setError('');if(!form.dossier_id){setError('Choisis un dossier.');return}if(quoteOnRequest&&!hasContactInfo){setError('Ajoute un téléphone ou un e-mail à ce dossier avant d’enregistrer : il faut pouvoir recontacter le client sous 24h.');return}setSaving(true);const quoteNumber=await createQuoteNumber();const notes=[quoteOnRequest?QUOTE_ON_REQUEST_MESSAGE:'',form.notes].filter(Boolean).join('\n');const {data:q,error:qError}=await supabase.from('quotes').insert({dossier_id:form.dossier_id,quote_number:quoteNumber,status:'draft',total_ht:totalHt,total_vat:vat,total_ttc:totalTtc,property_type:special?bienType:form.propertyType,property_size:bienType==='travaux'?['< 30 m²','30 à 60 m²','60 à 90 m²','90 à 150 m²','150 à 300 m²','300 à 550 m²','550 à 850 m²','850 à 1 200 m²'][at.tranche]:bienType==='local'?['< 30 m²','30 à 60 m²','60 à 90 m²','90 à 150 m²','150 à 300 m²','300 à 550 m²','550 à 850 m²','850 à 1 200 m²'][lp.tranche]:bienType==='immeuble'?`R+${im.etages}`:form.propertyType==='apartment'?apartmentLabels[sizeIndex]:houseLabels[sizeIndex],quote_kind:quoteKind,notes:notes||null}).select('id').single();if(qError||!q){setError(qError?.message||'Impossible de créer le devis.');setSaving(false);return}const {error:lError}=await supabase.from('quote_lines').insert(lines.map((l,i)=>({quote_id:q.id,label:l.label,quantity:1,unit_ttc:l.ttc,total_ttc:l.ttc,sort_order:i})));if(lError){setError(lError.message);setSaving(false);return}setSaving(false);router.push(`/devis/${q.id}`)}
 if(loading)return <AppShell active="devis" adminOnly><div className="loading">Chargement des devis…</div></AppShell>
 return <AppShell active="devis" adminOnly><main className="page" style={{maxWidth:1280}}>
  <div className="hero-row"><div><div className="eyebrow">DEVIS</div><h1>Devis Express</h1><p>Prépare le montant, puis garde la validation finale avant envoi.</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link href="/dossiers/nouveau" className="action-btn primary-action" title="Nouveau client / nouveau bien : crée le dossier puis revient ici pour chiffrer">＋ Nouveau devis</Link><button type="button" className="ghost-btn" disabled={saving} onClick={()=>void createFreeQuote()} title="Crée un devis vide pour le dossier choisi, à remplir toi-même">✎ Devis libre</button></div></div>
  <style>{`.dv-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr);gap:18px;align-items:start}@media(max-width:820px){.dv-grid{grid-template-columns:1fr}.dv-grid>*{position:static!important}}`}</style>
  <div className="dv-grid">
   <section className="card" style={{padding:22}}><h2 style={{marginTop:0,color:'#062b59'}}>Nouveau devis</h2>{error&&<div className="error">{error}</div>}<div className="edit-grid">
    <label className="edit-field wide"><span>Dossier</span><select value={form.dossier_id} onChange={e=>{setForm(f=>({...f,dossier_id:e.target.value}));setSuggestion(null)}}><option value="">Choisir un dossier…</option>{dossiers.map(d=><option key={d.id} value={d.id}>{d.dossier_name}</option>)}</select></label>{dossiers.length===0&&<div className="wide" style={{fontSize:13,color:'#52657a'}}>Aucun dossier pour l’instant : clique sur <Link href="/dossiers/nouveau" style={{color:'#1367b5',fontWeight:700}}>＋ Nouveau devis</Link> pour saisir le client et le bien.</div>}
    {selectedDossier?.purpose==='sale'&&splitDiagnostics(selectedDossier.diagnostics).includes('Termites')&&<div className="wide" style={{fontSize:13}}><a href="https://termite.com.fr/rechercher" target="_blank" rel="noopener noreferrer">Vérifier si le bien est en zone à risque termite</a></div>}
    <div className="wide" style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'12px 14px',border:'1px solid #cbddea',borderRadius:12,background:'#f5f9fd'}}><button type="button" className="ghost-btn" onClick={analyzeDossier}>✦ Générer une proposition</button><span style={{fontSize:13,color:'#52657a'}}>ARIA analyse le dossier, mais ne crée ni n’envoie rien sans ta validation.</span></div>
    {suggestion&&<div className="wide" style={{padding:16,border:'1px solid #a9d4bf',borderRadius:12,background:'#f2fbf6'}}><div className="eyebrow">PROPOSITION ARIA</div><h3 style={{margin:'4px 0 8px',color:'#062b59'}}>{suggestion.propertyType==='house'?'Maison':'Appartement'} · {suggestion.missionMinimale?'Mission minimale (DPE seul)':`Pack ${suggestion.packCount} diagnostics`}</h3>{suggestion.reasons.length>0&&<ul style={{margin:'0 0 10px',paddingLeft:20,color:'#315a48'}}>{suggestion.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}{suggestion.warnings.length>0&&<div style={{padding:10,borderRadius:9,background:'#fff8e6',color:'#7a5612'}}><b>À vérifier avant validation</b><ul style={{margin:'6px 0 0',paddingLeft:20}}>{suggestion.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div>}<div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}><button type="button" className="ghost-btn" onClick={()=>setSuggestion(null)}>Ignorer</button><button type="button" className="action-btn primary-action" onClick={applySuggestion}>Appliquer au brouillon</button></div></div>}
    <label className="edit-field"><span>Type de bien</span><select value={bienType} onChange={e=>changeBienType(e.target.value as BienType)}><option value="apartment">Appartement</option><option value="house">Maison</option><option value="local">Local professionnel</option><option value="immeuble">Immeuble (parties communes)</option><option value="travaux">Avant travaux / démolition</option></select></label>
    {bienType==='travaux'&&<>
     <label className="edit-field"><span>Repérage</span><select value={at.kind} onChange={e=>setAt(x=>({...x,kind:e.target.value}))}><option value="travaux">Avant travaux</option><option value="demolition">Avant démolition</option></select></label>
     <label className="edit-field"><span>Surface concernée</span><select value={at.tranche} onChange={e=>setAt(x=>({...x,tranche:Number(e.target.value)}))}>{['< 30 m²','30 à 60 m²','60 à 90 m²','90 à 150 m²','150 à 300 m²','300 à 550 m²','550 à 850 m²','850 à 1 200 m²'].map((l,i)=><option key={l} value={i}>{l}</option>)}</select></label>
     <div className="wide" style={{display:'flex',gap:16,flexWrap:'wrap'}}><label className="check-field"><input type="checkbox" checked={at.amiante} onChange={e=>setAt(x=>({...x,amiante:e.target.checked}))}/><span>Amiante (analyses laboratoire en supplément)</span></label><label className="check-field"><input type="checkbox" checked={at.plomb} onChange={e=>setAt(x=>({...x,plomb:e.target.checked}))}/><span>Plomb</span></label><label className="check-field"><input type="checkbox" checked={at.termites} onChange={e=>setAt(x=>({...x,termites:e.target.checked}))}/><span>Termites</span></label></div>
    </>}
    {bienType==='local'&&<>
     <label className="edit-field"><span>Opération</span><select value={lp.op} onChange={e=>setLp(x=>({...x,op:e.target.value}))}><option value="vente">Vente</option><option value="location">Location</option><option value="cession">Cession / reprise de bail</option><option value="travaux">Avant travaux</option><option value="cva">Contrôle visuel amiante</option></select></label>
     {(lp.op==='vente'||lp.op==='location'||lp.op==='cession')&&<label className="edit-field"><span>Permis de construire</span><select value={lp.permis} onChange={e=>setLp(x=>({...x,permis:e.target.value}))}><option value="A">Avant le 1er juillet 1997</option><option value="P">Après le 1er juillet 1997</option></select></label>}
     <label className="edit-field"><span>Surface</span><select value={lp.tranche} onChange={e=>setLp(x=>({...x,tranche:Number(e.target.value)}))}>{['< 30 m²','30 à 60 m²','60 à 90 m²','90 à 150 m²','150 à 300 m²','300 à 550 m²','550 à 850 m²','850 à 1 200 m²'].map((l,i)=><option key={l} value={i}>{l}</option>)}</select></label>
     {(()=>{const prefix=lp.op==='vente'?`VP-${lp.permis}`:lp.op==='location'?`LP-${lp.permis}`:lp.op==='cession'?`CF-${lp.permis}`:lp.op==='cva'?'CVA-':'RAAT-';const rows=TR.map((c,i)=>({i,it:findRef(`${prefix}${c}`)})).filter(r=>r.it);if(!rows.length)return null;const title=lp.op==='vente'?'Grille vente locaux professionnels':lp.op==='location'?'Grille location locaux professionnels':lp.op==='cession'?'Grille cession / reprise de bail':lp.op==='cva'?'Grille contrôle visuel amiante':'Grille repérage amiante avant travaux';return <div className="wide" style={{border:'1px solid #cbddea',borderRadius:12,overflow:'hidden'}}><div style={{padding:'8px 12px',background:'#f5f9fd',fontWeight:700,color:'#062b59',fontSize:13}}>{title}{lp.op==='vente'||lp.op==='location'||lp.op==='cession'?` – permis ${lp.permis==='A'?'avant':'après'} le 1er juillet 1997`:''} (TTC)</div>{rows.map(({i,it})=><button key={i} type="button" disabled={it!.toVerify} onClick={()=>setLp(x=>({...x,tranche:i}))} style={{display:'flex',justifyContent:'space-between',width:'100%',padding:'7px 12px',border:0,borderTop:'1px solid #edf2f7',background:lp.tranche===i?'#e6f0fb':'#fff',fontWeight:lp.tranche===i?700:400,cursor:it!.toVerify?'not-allowed':'pointer',opacity:it!.toVerify?.5:1,fontSize:13}}><span>{['< 30 m²','30 à 60 m²','60 à 90 m²','90 à 150 m²','150 à 300 m²','300 à 550 m²','550 à 850 m²','850 à 1 200 m²'][i]}</span><span>{it!.toVerify?'à vérifier':euro(it!.ttc)}</span></button>)}</div>})()}
     {lp.op==='travaux'&&<div className="wide" style={{display:'flex',gap:16,flexWrap:'wrap'}}><label className="check-field"><input type="checkbox" checked={lp.amiante} onChange={e=>setLp(x=>({...x,amiante:e.target.checked}))}/><span>Amiante</span></label><label className="check-field"><input type="checkbox" checked={lp.plomb} onChange={e=>setLp(x=>({...x,plomb:e.target.checked}))}/><span>Plomb</span></label><label className="check-field"><input type="checkbox" checked={lp.termites} onChange={e=>setLp(x=>({...x,termites:e.target.checked}))}/><span>Termites</span></label></div>}
    </>}
    {bienType==='immeuble'&&<>
     <label className="edit-field"><span>Nombre d’étages</span><select value={im.etages} onChange={e=>setIm(x=>({...x,etages:Number(e.target.value)}))}>{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>R+{n}</option>)}</select></label>
     <div className="wide" style={{display:'flex',gap:16,flexWrap:'wrap'}}><label className="check-field"><input type="checkbox" checked={im.dta} onChange={e=>setIm(x=>({...x,dta:e.target.checked}))}/><span>DTA parties communes</span></label><label className="check-field"><input type="checkbox" checked={im.plomb} onChange={e=>setIm(x=>({...x,plomb:e.target.checked}))}/><span>Plomb parties communes</span></label><label className="check-field"><input type="checkbox" checked={im.termites} onChange={e=>setIm(x=>({...x,termites:e.target.checked}))}/><span>Termites parties communes</span></label></div>
     <label className="edit-field"><span>Assainissement (nombre de cages d’escalier)</span><input type="number" min={0} value={im.cages} onChange={e=>setIm(x=>({...x,cages:Math.max(0,Number(e.target.value)||0)}))}/></label>
     <label className="edit-field"><span>DPE collectif (nombre de lots, 50 max)</span><input type="number" min={0} max={50} value={im.lots} onChange={e=>setIm(x=>({...x,lots:Math.max(0,Math.min(50,Number(e.target.value)||0))}))}/></label>
    </>}
    {autoMissing&&<div className="wide error">{autoMissing}</div>}
    {!special&&<>
    <label className="edit-field"><span>{form.propertyType==='apartment'?'Type':'Surface'}</span><select value={form.sizeKey} onChange={e=>setForm(f=>({...f,sizeKey:e.target.value}))}>{(form.propertyType==='apartment'?apartmentLabels:houseLabels).map((x,i)=><option value={i} key={x}>{x}</option>)}</select></label>
    <label className="edit-field"><span>Nombre de diagnostics</span><select value={effectivePack} disabled={missionMinimale||alaCarte} onChange={e=>setForm(f=>({...f,packCount:Number(e.target.value)}))}>{allowedPacks.map(n=><option key={n} value={n}>{n} diagnostics</option>)}</select></label><div/>
    <label className="check-field"><input type="checkbox" checked={missionMinimale} onChange={e=>{const v=e.target.checked;setMissionMinimale(v);if(v){setALaCarte(false);setALaCarteChecked(new Set())}else{setErpOptionChecked(false)}}}/><span>Mission minimale (DPE seul)</span></label>
    {(missionMinimale||alaCarteAskSurfaceAttestation)&&<label className="check-field"><input type="checkbox" checked={hasSurfaceAttestation} onChange={e=>setHasSurfaceAttestation(e.target.checked)}/><span>Le client possède déjà une attestation de surface</span></label>}
    {missionMinimale&&hasSurfaceAttestation&&<label className="check-field"><input type="checkbox" checked={erpOptionChecked} onChange={e=>setErpOptionChecked(e.target.checked)}/><span>ERP en option (+25 €)</span></label>}
    <label className="check-field"><input type="checkbox" checked={alaCarte} onChange={e=>{const v=e.target.checked;setALaCarte(v);if(v){setMissionMinimale(false);setHasSurfaceAttestation(false);setErpOptionChecked(false)}else{setALaCarteChecked(new Set())}}}/><span>Diagnostics à la carte</span></label>
    {alaCarte&&<div className="wide" style={{display:'grid',gap:8,padding:'12px 14px',border:'1px solid #cbddea',borderRadius:12,background:'#f5f9fd'}}>{ALACARTE_ITEM_IDS.map(id=><label key={id} style={{display:'flex',alignItems:'center',gap:10,fontWeight:600}}><input type="checkbox" checked={alaCarteChecked.has(id)} onChange={()=>toggleALaCarteItem(id)}/><span>{alaCarteItemLabel(id,form.propertyType)}</span></label>)}</div>}
    {!missionMinimale&&!alaCarte&&form.propertyType==='house'&&<label className="edit-field"><span>Mesurage facturé en option</span><select value={form.measurement} disabled={quoteOnRequest} onChange={e=>setForm(f=>({...f,measurement:e.target.value as Measurement}))}><option value="none">Aucun</option><option value="boutin">Mesurage (surface habitable)</option><option value="attestation">Attestation de mesurage</option></select></label>}
    <label className="check-field"><input type="checkbox" checked={form.assainissement} onChange={e=>setForm(f=>({...f,assainissement:e.target.checked}))}/><span>Assainissement</span></label>
    </>}
    {quoteOnRequest&&<div className="wide" style={{padding:16,border:'1px solid #f0c76a',borderRadius:12,background:'#fff8e6',color:'#7a5612'}}><b>{QUOTE_ON_REQUEST_MESSAGE}</b><div style={{marginTop:10,fontSize:13}}>{selectedDossier?<>Contact enregistré : <b>{selectedDossier.contact_name||'—'}</b>{selectedDossier.contact_phone?` · ${selectedDossier.contact_phone}`:''}{selectedDossier.contact_email?` · ${selectedDossier.contact_email}`:''}</>:'Choisis un dossier pour vérifier ses coordonnées de contact.'}</div>{selectedDossier&&!hasContactInfo&&<div style={{marginTop:8,color:'#8a1f11'}}>Aucun téléphone ni e-mail enregistré pour ce dossier — ajoute une coordonnée avant d’enregistrer pour pouvoir recontacter le client sous 24h.</div>}</div>}
    {!special&&<div className="edit-field wide"><span>Remise pro</span><label className="check-field" style={{opacity:accountIsValidatedPro?1:.6}}><input type="checkbox" disabled={!accountIsValidatedPro} checked={proApplied} onChange={e=>setProOverride({dossier:form.dossier_id,on:e.target.checked})}/><span>Remise partenaire -10 %{proApplied&&proDiscount>0?` (−${euro(proDiscount)})`:''}</span></label><div style={{fontSize:13,color:'#66788c',marginTop:4}}>{proStatusText}</div></div>}
    {!special&&!proApplied&&<div className="edit-field wide"><span>Code promo professionnel</span>{promo?<div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',border:'1px solid #a9d4bf',borderRadius:10,background:'#f2fbf6'}}><b style={{color:'#176b35'}}>{promo.code}</b><span style={{fontSize:13,color:'#315a48'}}>{promo.label||(promo.discount_type==='percent'?`-${promo.discount_value}%`:`-${euro(promo.discount_value)}`)}</span><button type="button" className="ghost-btn" style={{marginLeft:'auto'}} onClick={removePromo}>Retirer</button></div>:<div style={{display:'flex',gap:8}}><input value={promoCode} onChange={e=>setPromoCode(e.target.value)} placeholder="PRO10" style={{flex:1}}/><button type="button" className="ghost-btn" onClick={applyPromo}>Appliquer</button></div>}{promoError&&<div className="error" style={{marginTop:6}}>{promoError}</div>}</div>}
    <div className="edit-field wide"><span>Prestations réservées ARIA (non visibles des clients et des pros)</span>
     <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <select value={extraRef} onChange={e=>setExtraRef(e.target.value)} style={{flex:'1 1 280px'}}>
       <option value="">Choisir une prestation…</option>
       {INTERNAL_PRICING.map(c=><optgroup key={c.id} label={c.title}>{c.items.map(it=><option key={it.ref} value={it.ref} disabled={it.toVerify}>{it.ref} · {it.label} · {euro(it.ttc)} TTC{it.toVerify?' — à vérifier':''}</option>)}</optgroup>)}
      </select>
      <button type="button" className="ghost-btn" disabled={!extraRef} onClick={()=>{const it=INTERNAL_PRICING.flatMap(c=>c.items).find(i=>i.ref===extraRef);if(it)setExtras(x=>[...x,{...it,qty:1}]);setExtraRef('')}}>Ajouter</button>
     </div>
     {!special&&<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8,alignItems:'center'}}>
      <span style={{fontSize:13,color:'#52657a'}}>Actualisation (diagnostic initial fait par ARIA, -20 %, sans cumul avec la remise pro) :</span>
      {(['termites','plomb'] as const).map(id=>{const unit=getALaCarteUnitPrice(form.propertyType,id,sizeIndex);if(!unit)return null;const price=Math.ceil(unit*0.8);const size=form.propertyType==='apartment'?apartmentLabels[sizeIndex]:houseLabels[sizeIndex];const name=id==='termites'?'Termites':'Plomb (CREP)';return <button key={id} type="button" className="ghost-btn" onClick={()=>setExtras(x=>[...x,{ref:`ACT-${id==='termites'?'T':'P'}`,label:`Actualisation ${name.toLowerCase()} – ${form.propertyType==='apartment'?'appartement':'maison'} ${size}`,ttc:price,detail:`-20 % client ARIA, au lieu de ${unit} €`,qty:1}])}>+ {name} : {euro(price)} <span style={{textDecoration:'line-through',opacity:.6}}>{euro(unit)}</span></button>})}
     </div>}
     {extras.length>0&&<div style={{display:'grid',gap:6,marginTop:8}}>{extras.map((x,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:'8px 12px',border:'1px solid #dce6f0',borderRadius:10,background:'#f7fafd',fontSize:13}}><span><b>{x.ref}</b> · {x.label}{x.detail?` (${x.detail})`:''}{x.note?<em style={{display:'block',color:'#a45121',fontSize:12}}>À vérifier : {x.note}</em>:null}</span><span style={{display:'flex',gap:10,alignItems:'center'}}>{x.unit&&<label style={{display:'flex',alignItems:'center',gap:4,fontSize:12}}>{x.unit}s<input type="number" min={1} max={x.maxQty||999} value={x.qty} onChange={e=>{const q=Math.max(1,Math.min(x.maxQty||999,Number(e.target.value)||1));setExtras(all=>all.map((y,j)=>j===i?{...y,qty:q}:y))}} style={{width:64}}/></label>}<b>{euro(x.ttc*x.qty)}</b><button type="button" className="ghost-btn" onClick={()=>setExtras(e=>e.filter((_,j)=>j!==i))}>Retirer</button></span></div>)}</div>}
     {!special&&<label className="check-field" style={{marginTop:6}}><input type="checkbox" checked={extrasOnly} onChange={e=>setExtrasOnly(e.target.checked)}/><span>Devis sans pack (uniquement ces prestations)</span></label>}
    </div>
    <label className="edit-field wide"><span>Notes internes</span><textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Remise commerciale, précision dossier, information à vérifier…"/></label>
   </div></section>
   <aside className="card" style={{padding:22,position:'sticky',top:18}}><div className="eyebrow">APERÇU</div><h2 style={{margin:'4px 0 14px',color:'#062b59'}}>Montant du devis</h2><div style={{display:'grid',gap:9}}>{quoteOnRequest?<div style={{padding:'12px 14px',border:'1px solid #f0c76a',borderRadius:10,background:'#fff8e6',color:'#7a5612',fontSize:13,lineHeight:1.5}}>{QUOTE_ON_REQUEST_MESSAGE}</div>:lines.map((l,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,borderBottom:'1px solid #edf2f7',paddingBottom:8}}><span>{l.label}</span><b>{euro(l.ttc)}</b></div>)}</div><div style={{marginTop:16,paddingTop:14,borderTop:'2px solid #dce6f0'}}>{quoteOnRequest?<div style={{display:'flex',justifyContent:'space-between',fontSize:20,color:'#062b59'}}><strong>Total</strong><strong>Sur devis</strong></div>:<><div style={{display:'flex',justifyContent:'space-between'}}><span>HT</span><b>{euro(totalHt)}</b></div><div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><span>TVA 20 %</span><b>{euro(vat)}</b></div><div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:24,color:'#062b59'}}><strong>TTC</strong><strong>{euro(totalTtc)}</strong></div></>}</div><button className="action-btn primary-action" style={{width:'100%',marginTop:18}} disabled={saving||(quoteOnRequest&&!hasContactInfo)} onClick={save}>{saving?'Création…':quoteOnRequest?'Enregistrer la demande d’évaluation':'Créer le brouillon'}</button><p style={{fontSize:12,color:'#6f7d90',marginBottom:0}}>Le devis reste en brouillon : aucune transmission automatique.</p></aside>
  </div>
  <section className="section"><div className="section-title"><h2>Derniers devis</h2></div><div className="card table-card"><div className="table-head"><div>N° devis</div><div>Statut</div><div>TTC</div><div>Date</div></div>{quotes.length===0?<div className="table-row"><div>Aucun devis.</div></div>:quotes.map(q=><Link href={`/devis/${q.id}`} className="table-row" key={q.id}><div><b>{q.quote_number}</b></div><div><span className="status">{quoteStatus(q.status)}</span></div><div>{euro(Number(q.total_ttc||0))}</div><div>{dateFr(q.created_at)}</div></Link>)}</div></section>
 </main></AppShell>
}
