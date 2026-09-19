'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { APARTMENT_ASSAINISSEMENT_PRICE, buildQuoteSuggestion, HOUSE_ASSAINISSEMENT_PRICE, HOUSE_SIZE_TIERS, QuoteSuggestion, splitDiagnostics } from '@/lib/quote-assistant'
import { ALACARTE_ITEM_IDS, ALaCarteItemId, APARTMENT_DPE_ONLY_PRICES, ERP_OPTION_PRICE, getALaCartePrice, getPackPrice, HOUSE_DPE_ONLY_PRICES, PackPurpose } from '@/lib/property-pricing'
import { supabase } from '@/lib/supabase'

type Dossier={id:string;dossier_name:string;purpose?:string|null;diagnostics?:string[]|string|null;property_address?:string|null;property_type?:string|null;property_size?:string|number|null;surface?:string|number|null;rooms?:string|number|null;dependencies?:string|null;contact_name?:string|null;contact_phone?:string|null;contact_email?:string|null}
type Quote={id:string;quote_number:string;status:string;total_ht:number;total_vat:number;total_ttc:number;created_at:string;dossier_id:string}
type PropertyType='apartment'|'house'
type Measurement='none'|'boutin'|'attestation'
type FormState={dossier_id:string;propertyType:PropertyType;sizeKey:string;packCount:number;measurement:Measurement;assainissement:boolean;proximity:boolean;notes:string}

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

export default function DevisPage(){
 const router=useRouter();const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [dossiers,setDossiers]=useState<Dossier[]>([]);const [quotes,setQuotes]=useState<Quote[]>([])
 const [suggestion,setSuggestion]=useState<QuoteSuggestion|null>(null)
 const [form,setForm]=useState<FormState>({dossier_id:'',propertyType:'apartment',sizeKey:'0',packCount:2,measurement:'none',assainissement:false,proximity:false,notes:''})
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
 const [promoCode,setPromoCode]=useState('');const [promo,setPromo]=useState<{code:string;label:string|null;discount_type:'percent'|'fixed';discount_value:number}|null>(null);const [promoError,setPromoError]=useState('')
 const applyPromo=async()=>{setPromoError('');const code=promoCode.trim().toUpperCase();if(!code){setPromoError('Entre un code.');return}const escaped=code.replace(/[%_]/g,'\\$&');const {data,error}=await supabase.from('promo_codes').select('code,label,discount_type,discount_value').ilike('code',escaped).maybeSingle();if(error||!data){setPromoError('Code invalide ou expiré.');setPromo(null);return}setPromo(data as any)}
 const removePromo=()=>{setPromo(null);setPromoCode('');setPromoError('')}
 const load=async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}const [d,q]=await Promise.all([supabase.from('dossiers').select('*').order('created_at',{ascending:false}),supabase.from('quotes').select('id,quote_number,status,total_ht,total_vat,total_ttc,created_at,dossier_id').order('created_at',{ascending:false}).limit(20)]);if(d.data){const requested=new URLSearchParams(window.location.search).get('dossier');setDossiers(d.data as Dossier[]);setForm(f=>({...f,dossier_id:f.dossier_id||d.data?.find(item=>item.id===requested)?.id||d.data?.[0]?.id||''}))}if(q.data)setQuotes(q.data as Quote[]);setLoading(false)}
 useEffect(()=>{void load()},[])
 const sizeLabels=form.propertyType==='apartment'?apartmentLabels:houseLabels
 const sizeIndex=Math.max(0,Math.min(sizeLabels.length-1,Number(form.sizeKey)||0)),allowedPacks=form.propertyType==='apartment'?[2,3,4,5,6,7]:[2,3,4,5,6],effectivePack=allowedPacks.includes(form.packCount)?form.packCount:allowedPacks[0]
 // Au-delà du maximum existant (7 appartement / 6 maison), comportement
 // actuel de dépassement de pack : "sur devis", comme pour houseOver250.
 const alaCarteMaxPack=form.propertyType==='apartment'?7:6
 const alaCarteOverflow=alaCarte&&alaCarteChecked.size>alaCarteMaxPack
 const quoteOnRequest=(form.propertyType==='house'&&sizeIndex===HOUSE_QUOTE_ON_REQUEST_INDEX)||alaCarteOverflow
 const selectedDossier=dossiers.find(d=>d.id===form.dossier_id)
 const hasContactInfo=!!(selectedDossier?.contact_phone||selectedDossier?.contact_email)
 // Objet du dossier (Vente/Location) : source de la remise -10% sur le pack
 // en location, calculée par lib/property-pricing.ts (seule source commune
 // avec /assistant). Aucun dossier sélectionné, ou objet autre que
 // vente/location (travaux, autre) : prix vente par défaut, non remisé.
 const packPurpose:PackPurpose=selectedDossier?.purpose==='rental'?'rental':'sale'
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
 const alaCartePrice=alaCarte&&!quoteOnRequest?getALaCartePrice(form.propertyType,Array.from(alaCarteChecked),sizeIndex)??0:0
 const base=quoteOnRequest?0:alaCarte?alaCartePrice:(missionMinimale?missionBase:getPackPrice(form.propertyType,effectivePack,sizeIndex,packPurpose)??0),measurement=!missionMinimale&&!alaCarte&&form.propertyType==='house'&&form.measurement!=='none'&&!quoteOnRequest?HOUSE_SIZE_TIERS[sizeIndex]?.measurementPrice||0:0,assainissement=form.assainissement?(form.propertyType==='apartment'?APARTMENT_ASSAINISSEMENT_PRICE:HOUSE_ASSAINISSEMENT_PRICE):0,proximity=form.proximity?-10:0
 const promoDiscount=!quoteOnRequest&&promo?(promo.discount_type==='percent'?Math.round((base+measurement+erpOptionPrice+assainissement)*promo.discount_value)/100:Math.min(promo.discount_value,base+measurement+erpOptionPrice+assainissement)):0
 const totalTtc=quoteOnRequest?0:Math.max(0,base+measurement+erpOptionPrice+assainissement+proximity-promoDiscount),totalHt=quoteOnRequest?0:Math.round(totalTtc/1.2*100)/100,vat=quoteOnRequest?0:Math.round((totalTtc-totalHt)*100)/100
 const lines=useMemo(()=>{if(quoteOnRequest)return [{label:QUOTE_ON_REQUEST_MESSAGE,ttc:0}];const alaCarteLabel=`Diagnostics à la carte : ${Array.from(alaCarteChecked).map(id=>alaCarteItemLabel(id,form.propertyType)).join(', ')||'aucun sélectionné'}`;const out=[alaCarte?{label:alaCarteLabel,ttc:base}:missionMinimale?{label:hasSurfaceAttestation?'Mission minimale : DPE seul':'Mission minimale : DPE + attestation de surface (pack 2)',ttc:base}:{label:`Pack ${effectivePack} diagnostics – ${form.propertyType==='apartment'?apartmentLabels[sizeIndex]:houseLabels[sizeIndex]}`,ttc:base}];if(erpFree)out.push({label:'ERP (état des risques et pollutions) — 25 € offert',ttc:0});if(erpOptionPrice>0)out.push({label:'ERP (état des risques et pollutions) — option',ttc:erpOptionPrice});if(!missionMinimale&&!alaCarte&&form.propertyType==='house'&&form.measurement==='boutin')out.push({label:'Mesurage (surface habitable)',ttc:measurement});if(!missionMinimale&&!alaCarte&&form.propertyType==='house'&&form.measurement==='attestation')out.push({label:'Attestation de mesurage',ttc:measurement});if(form.assainissement)out.push({label:'Contrôle de l’assainissement',ttc:assainissement});if(form.proximity)out.push({label:'Remise proximité Alfortville / Maisons-Alfort',ttc:-10});if(promo)out.push({label:`Code pro ${promo.code}${promo.label?' – '+promo.label:''}`,ttc:-promoDiscount});return out},[base,measurement,erpFree,erpOptionPrice,assainissement,missionMinimale,alaCarte,alaCarteChecked,hasSurfaceAttestation,form.measurement,form.assainissement,form.proximity,form.propertyType,sizeIndex,effectivePack,promo,promoDiscount,quoteOnRequest])
 const analyzeDossier=()=>{setError('');const dossier=dossiers.find(item=>item.id===form.dossier_id);if(!dossier){setError('Choisis un dossier avant de lancer l’analyse.');return}setSuggestion(buildQuoteSuggestion(dossier))}
 const applySuggestion=()=>{if(!suggestion)return;const trace=[suggestion.diagnostics.length?`Missions détectées : ${suggestion.diagnostics.join(', ')}.`:'',...suggestion.warnings].filter(Boolean).join(' ');setForm(f=>({...f,propertyType:suggestion.propertyType,sizeKey:suggestion.sizeKey,packCount:suggestion.packCount,measurement:!suggestion.missionMinimale&&suggestion.propertyType==='house'&&suggestion.boutin?'boutin':'none',assainissement:suggestion.assainissement,proximity:suggestion.proximity,notes:[f.notes,trace].filter(Boolean).join('\n')}));setMissionMinimale(suggestion.missionMinimale);if(!suggestion.missionMinimale)setErpOptionChecked(false);setSuggestion(null)}
 const createQuoteNumber=async()=>{const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,prefix=`DEV-${stamp}-`;const {data}=await supabase.from('quotes').select('quote_number').like('quote_number',`${prefix}%`).order('quote_number',{ascending:false}).limit(1),last=data?.[0]?.quote_number||'',n=last?Number(last.slice(-3))+1:1;return `${prefix}${String(n).padStart(3,'0')}`}
 const quoteKind=quoteOnRequest?(alaCarteOverflow?'alacarte_sur_devis':`pack_${effectivePack}_sur_devis`):alaCarte?`alacarte_${alaCarteChecked.size}`:missionMinimale?(hasSurfaceAttestation?'mission_minimale_dpe_seul':'mission_minimale_pack2'):`pack_${effectivePack}`
 const save=async()=>{setError('');if(!form.dossier_id){setError('Choisis un dossier.');return}if(quoteOnRequest&&!hasContactInfo){setError('Ajoute un téléphone ou un e-mail à ce dossier avant d’enregistrer : il faut pouvoir recontacter le client sous 24h.');return}setSaving(true);const quoteNumber=await createQuoteNumber();const notes=[quoteOnRequest?QUOTE_ON_REQUEST_MESSAGE:'',form.notes].filter(Boolean).join('\n');const {data:q,error:qError}=await supabase.from('quotes').insert({dossier_id:form.dossier_id,quote_number:quoteNumber,status:'draft',total_ht:totalHt,total_vat:vat,total_ttc:totalTtc,property_type:form.propertyType,property_size:form.propertyType==='apartment'?apartmentLabels[sizeIndex]:houseLabels[sizeIndex],quote_kind:quoteKind,notes:notes||null}).select('id').single();if(qError||!q){setError(qError?.message||'Impossible de créer le devis.');setSaving(false);return}const {error:lError}=await supabase.from('quote_lines').insert(lines.map((l,i)=>({quote_id:q.id,label:l.label,quantity:1,unit_ttc:l.ttc,total_ttc:l.ttc,sort_order:i})));if(lError){setError(lError.message);setSaving(false);return}setSaving(false);router.push(`/devis/${q.id}`)}
 if(loading)return <AppShell active="devis"><div className="loading">Chargement des devis…</div></AppShell>
 return <AppShell active="devis"><main className="page" style={{maxWidth:1280}}>
  <div className="hero-row"><div><div className="eyebrow">DEVIS</div><h1>Devis Express</h1><p>Prépare le montant, puis garde la validation finale avant envoi.</p></div></div>
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(320px,.65fr)',gap:18,alignItems:'start'}}>
   <section className="card" style={{padding:22}}><h2 style={{marginTop:0,color:'#062b59'}}>Nouveau devis</h2>{error&&<div className="error">{error}</div>}<div className="edit-grid">
    <label className="edit-field wide"><span>Dossier</span><select value={form.dossier_id} onChange={e=>{setForm(f=>({...f,dossier_id:e.target.value}));setSuggestion(null)}}><option value="">Choisir un dossier…</option>{dossiers.map(d=><option key={d.id} value={d.id}>{d.dossier_name}</option>)}</select></label>
    {selectedDossier?.purpose==='sale'&&splitDiagnostics(selectedDossier.diagnostics).includes('Termites')&&<div className="wide" style={{fontSize:13}}><a href="https://termite.com.fr/rechercher" target="_blank" rel="noopener noreferrer">Vérifier si le bien est en zone à risque termite</a></div>}
    <div className="wide" style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'12px 14px',border:'1px solid #cbddea',borderRadius:12,background:'#f5f9fd'}}><button type="button" className="ghost-btn" onClick={analyzeDossier}>✦ Générer une proposition</button><span style={{fontSize:13,color:'#52657a'}}>ARIA analyse le dossier, mais ne crée ni n’envoie rien sans ta validation.</span></div>
    {suggestion&&<div className="wide" style={{padding:16,border:'1px solid #a9d4bf',borderRadius:12,background:'#f2fbf6'}}><div className="eyebrow">PROPOSITION ARIA</div><h3 style={{margin:'4px 0 8px',color:'#062b59'}}>{suggestion.propertyType==='house'?'Maison':'Appartement'} · {suggestion.missionMinimale?'Mission minimale (DPE seul)':`Pack ${suggestion.packCount} diagnostics`}</h3>{suggestion.reasons.length>0&&<ul style={{margin:'0 0 10px',paddingLeft:20,color:'#315a48'}}>{suggestion.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}{suggestion.warnings.length>0&&<div style={{padding:10,borderRadius:9,background:'#fff8e6',color:'#7a5612'}}><b>À vérifier avant validation</b><ul style={{margin:'6px 0 0',paddingLeft:20}}>{suggestion.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div>}<div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}><button type="button" className="ghost-btn" onClick={()=>setSuggestion(null)}>Ignorer</button><button type="button" className="action-btn primary-action" onClick={applySuggestion}>Appliquer au brouillon</button></div></div>}
    <label className="edit-field"><span>Type de bien</span><select value={form.propertyType} onChange={e=>{setForm(f=>({...f,propertyType:e.target.value as PropertyType,packCount:2,sizeKey:'0',measurement:'none'}));setHasSurfaceAttestation(false);setErpOptionChecked(false);setALaCarteChecked(new Set())}}><option value="apartment">Appartement</option><option value="house">Maison</option></select></label>
    <label className="edit-field"><span>{form.propertyType==='apartment'?'Type':'Surface'}</span><select value={form.sizeKey} onChange={e=>setForm(f=>({...f,sizeKey:e.target.value}))}>{(form.propertyType==='apartment'?apartmentLabels:houseLabels).map((x,i)=><option value={i} key={x}>{x}</option>)}</select></label>
    <label className="edit-field"><span>Nombre de diagnostics</span><select value={effectivePack} disabled={missionMinimale||alaCarte} onChange={e=>setForm(f=>({...f,packCount:Number(e.target.value)}))}>{allowedPacks.map(n=><option key={n} value={n}>{n} diagnostics</option>)}</select></label><div/>
    <label className="check-field"><input type="checkbox" checked={missionMinimale} onChange={e=>{const v=e.target.checked;setMissionMinimale(v);if(v){setALaCarte(false);setALaCarteChecked(new Set())}else{setErpOptionChecked(false)}}}/><span>Mission minimale (DPE seul)</span></label>
    {missionMinimale&&<label className="check-field"><input type="checkbox" checked={hasSurfaceAttestation} onChange={e=>setHasSurfaceAttestation(e.target.checked)}/><span>Le client possède déjà une attestation de surface</span></label>}
    {missionMinimale&&hasSurfaceAttestation&&<label className="check-field"><input type="checkbox" checked={erpOptionChecked} onChange={e=>setErpOptionChecked(e.target.checked)}/><span>ERP en option (+25 €)</span></label>}
    <label className="check-field"><input type="checkbox" checked={alaCarte} onChange={e=>{const v=e.target.checked;setALaCarte(v);if(v){setMissionMinimale(false);setHasSurfaceAttestation(false);setErpOptionChecked(false)}else{setALaCarteChecked(new Set())}}}/><span>Diagnostics à la carte</span></label>
    {alaCarte&&<div className="wide" style={{display:'grid',gap:8,padding:'12px 14px',border:'1px solid #cbddea',borderRadius:12,background:'#f5f9fd'}}>{ALACARTE_ITEM_IDS.map(id=><label key={id} style={{display:'flex',alignItems:'center',gap:10,fontWeight:600}}><input type="checkbox" checked={alaCarteChecked.has(id)} onChange={()=>toggleALaCarteItem(id)}/><span>{alaCarteItemLabel(id,form.propertyType)}</span></label>)}</div>}
    {!missionMinimale&&!alaCarte&&form.propertyType==='house'&&<label className="edit-field"><span>Mesurage facturé en option</span><select value={form.measurement} disabled={quoteOnRequest} onChange={e=>setForm(f=>({...f,measurement:e.target.value as Measurement}))}><option value="none">Aucun</option><option value="boutin">Mesurage (surface habitable)</option><option value="attestation">Attestation de mesurage</option></select></label>}
    <label className="check-field"><input type="checkbox" checked={form.assainissement} onChange={e=>setForm(f=>({...f,assainissement:e.target.checked}))}/><span>Assainissement</span></label><label className="check-field"><input type="checkbox" checked={form.proximity} onChange={e=>setForm(f=>({...f,proximity:e.target.checked}))}/><span>Remise proximité -10 €</span></label>
    {quoteOnRequest&&<div className="wide" style={{padding:16,border:'1px solid #f0c76a',borderRadius:12,background:'#fff8e6',color:'#7a5612'}}><b>{QUOTE_ON_REQUEST_MESSAGE}</b><div style={{marginTop:10,fontSize:13}}>{selectedDossier?<>Contact enregistré : <b>{selectedDossier.contact_name||'—'}</b>{selectedDossier.contact_phone?` · ${selectedDossier.contact_phone}`:''}{selectedDossier.contact_email?` · ${selectedDossier.contact_email}`:''}</>:'Choisis un dossier pour vérifier ses coordonnées de contact.'}</div>{selectedDossier&&!hasContactInfo&&<div style={{marginTop:8,color:'#8a1f11'}}>Aucun téléphone ni e-mail enregistré pour ce dossier — ajoute une coordonnée avant d’enregistrer pour pouvoir recontacter le client sous 24h.</div>}</div>}
    <div className="edit-field wide"><span>Code promo professionnel</span>{promo?<div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',border:'1px solid #a9d4bf',borderRadius:10,background:'#f2fbf6'}}><b style={{color:'#176b35'}}>{promo.code}</b><span style={{fontSize:13,color:'#315a48'}}>{promo.label||(promo.discount_type==='percent'?`-${promo.discount_value}%`:`-${euro(promo.discount_value)}`)}</span><button type="button" className="ghost-btn" style={{marginLeft:'auto'}} onClick={removePromo}>Retirer</button></div>:<div style={{display:'flex',gap:8}}><input value={promoCode} onChange={e=>setPromoCode(e.target.value)} placeholder="PRO10" style={{flex:1}}/><button type="button" className="ghost-btn" onClick={applyPromo}>Appliquer</button></div>}{promoError&&<div className="error" style={{marginTop:6}}>{promoError}</div>}</div>
    <label className="edit-field wide"><span>Notes internes</span><textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Remise commerciale, précision dossier, information à vérifier…"/></label>
   </div></section>
   <aside className="card" style={{padding:22,position:'sticky',top:18}}><div className="eyebrow">APERÇU</div><h2 style={{margin:'4px 0 14px',color:'#062b59'}}>Montant du devis</h2><div style={{display:'grid',gap:9}}>{quoteOnRequest?<div style={{padding:'12px 14px',border:'1px solid #f0c76a',borderRadius:10,background:'#fff8e6',color:'#7a5612',fontSize:13,lineHeight:1.5}}>{QUOTE_ON_REQUEST_MESSAGE}</div>:lines.map((l,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,borderBottom:'1px solid #edf2f7',paddingBottom:8}}><span>{l.label}</span><b>{euro(l.ttc)}</b></div>)}</div><div style={{marginTop:16,paddingTop:14,borderTop:'2px solid #dce6f0'}}>{quoteOnRequest?<div style={{display:'flex',justifyContent:'space-between',fontSize:20,color:'#062b59'}}><strong>Total</strong><strong>Sur devis</strong></div>:<><div style={{display:'flex',justifyContent:'space-between'}}><span>HT</span><b>{euro(totalHt)}</b></div><div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><span>TVA 20 %</span><b>{euro(vat)}</b></div><div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:24,color:'#062b59'}}><strong>TTC</strong><strong>{euro(totalTtc)}</strong></div></>}</div><button className="action-btn primary-action" style={{width:'100%',marginTop:18}} disabled={saving||(quoteOnRequest&&!hasContactInfo)} onClick={save}>{saving?'Création…':quoteOnRequest?'Enregistrer la demande d’évaluation':'Créer le brouillon'}</button><p style={{fontSize:12,color:'#6f7d90',marginBottom:0}}>Le devis reste en brouillon : aucune transmission automatique.</p></aside>
  </div>
  <section className="section"><div className="section-title"><h2>Derniers devis</h2></div><div className="card table-card"><div className="table-head"><div>N° devis</div><div>Statut</div><div>TTC</div><div>Date</div></div>{quotes.length===0?<div className="table-row"><div>Aucun devis.</div></div>:quotes.map(q=><Link href={`/devis/${q.id}`} className="table-row" key={q.id}><div><b>{q.quote_number}</b></div><div><span className="status">{quoteStatus(q.status)}</span></div><div>{euro(Number(q.total_ttc||0))}</div><div>{dateFr(q.created_at)}</div></Link>)}</div></section>
 </main></AppShell>
}
