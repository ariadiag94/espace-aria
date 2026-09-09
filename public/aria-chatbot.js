(() => {
  if (window.__ARIA_CHATBOT_LOADED__) return;
  window.__ARIA_CHATBOT_LOADED__ = true;

  const APPARTMENT_PACKS = {
    2: [150, 170, 190, 210, 230],
    3: [180, 200, 220, 240, 260],
    4: [210, 230, 250, 270, 290],
    5: [240, 260, 280, 300, 320],
    6: [270, 290, 305, 330, 350],
    7: [290, 310, 325, 360, 380],
  };
  const TYPES = ['T1', 'T2', 'T3', 'T4', 'T5'];

  const normalize = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const euro = (value) => `${Number(value).toLocaleString('fr-FR')} € TTC`;

  const style = document.createElement('style');
  style.textContent = `
    #aria-chatbot-root{font-family:Arial,Helvetica,sans-serif;position:fixed;right:20px;bottom:20px;z-index:2147483000;color:#16324f}
    #aria-chatbot-root *{box-sizing:border-box}
    .aria-chat-launcher{border:0;border-radius:999px;background:#062b59;color:white;box-shadow:0 12px 32px rgba(6,43,89,.28);padding:14px 18px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:9px;font-size:14px}
    .aria-chat-launcher:hover{transform:translateY(-1px)}
    .aria-chat-dot{width:10px;height:10px;border-radius:50%;background:#5bc4e8;box-shadow:0 0 0 4px rgba(91,196,232,.18)}
    .aria-chat-panel{position:absolute;right:0;bottom:62px;width:min(370px,calc(100vw - 28px));height:min(590px,calc(100vh - 110px));background:white;border:1px solid #d9e4ef;border-radius:20px;box-shadow:0 24px 70px rgba(7,32,58,.25);overflow:hidden;display:none;flex-direction:column}
    .aria-chat-panel.open{display:flex}
    .aria-chat-head{background:linear-gradient(135deg,#062b59,#0b6cb8);color:white;padding:16px 16px 14px;display:flex;justify-content:space-between;gap:12px;align-items:center}
    .aria-chat-brand{font-weight:800;font-size:16px}.aria-chat-sub{font-size:11px;opacity:.85;margin-top:3px}
    .aria-chat-close{border:0;background:rgba(255,255,255,.15);color:white;width:32px;height:32px;border-radius:10px;cursor:pointer;font-size:19px}
    .aria-chat-messages{flex:1;overflow-y:auto;padding:15px;background:#f6f9fc;scroll-behavior:smooth}
    .aria-chat-row{display:flex;margin:0 0 10px}.aria-chat-row.user{justify-content:flex-end}
    .aria-chat-bubble{max-width:87%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.42;white-space:pre-line}
    .aria-chat-row.bot .aria-chat-bubble{background:white;border:1px solid #dfe8f1;border-bottom-left-radius:5px}
    .aria-chat-row.user .aria-chat-bubble{background:#0b6cb8;color:white;border-bottom-right-radius:5px}
    .aria-chat-quick{display:flex;flex-wrap:wrap;gap:7px;padding:0 15px 12px;background:#f6f9fc}
    .aria-chat-chip{border:1px solid #bed2e5;background:white;color:#0b4a7d;border-radius:999px;padding:7px 10px;font-size:12px;cursor:pointer}
    .aria-chat-chip:hover{background:#eaf6fd}
    .aria-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e0e8f0;background:white}
    .aria-chat-input{flex:1;border:1px solid #c8d6e3;border-radius:12px;padding:10px 11px;font-size:13px;outline:none;min-width:0}
    .aria-chat-input:focus{border-color:#0b6cb8;box-shadow:0 0 0 3px rgba(11,108,184,.1)}
    .aria-chat-send{border:0;border-radius:12px;background:#062b59;color:white;padding:0 14px;font-weight:700;cursor:pointer}
    .aria-chat-foot{padding:0 12px 10px;background:white;font-size:10px;color:#75869a;text-align:center}
    .aria-chat-foot a{color:#0b6cb8;text-decoration:none}
    @media(max-width:520px){#aria-chatbot-root{right:12px;bottom:12px}.aria-chat-panel{position:fixed;right:10px;left:10px;bottom:74px;width:auto;height:min(620px,calc(100vh - 90px))}.aria-chat-launcher span.label{display:none}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'aria-chatbot-root';
  root.innerHTML = `
    <div class="aria-chat-panel" role="dialog" aria-label="Assistant ARIA Diagnostics" aria-modal="false">
      <div class="aria-chat-head">
        <div><div class="aria-chat-brand">ARIA Diagnostics</div><div class="aria-chat-sub">Assistant diagnostic immobilier</div></div>
        <button class="aria-chat-close" type="button" aria-label="Fermer">×</button>
      </div>
      <div class="aria-chat-messages" aria-live="polite"></div>
      <div class="aria-chat-quick"></div>
      <form class="aria-chat-form">
        <input class="aria-chat-input" type="text" autocomplete="off" placeholder="Posez votre question…" aria-label="Votre question" />
        <button class="aria-chat-send" type="submit">Envoyer</button>
      </form>
      <div class="aria-chat-foot">Aucune conversation n’est enregistrée dans cette version. <a href="mailto:contact@aria-diagnostics.fr">contact@aria-diagnostics.fr</a></div>
    </div>
    <button class="aria-chat-launcher" type="button" aria-label="Ouvrir l’assistant ARIA"><span class="aria-chat-dot"></span><span class="label">Une question ?</span></button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('.aria-chat-panel');
  const launcher = root.querySelector('.aria-chat-launcher');
  const closer = root.querySelector('.aria-chat-close');
  const messages = root.querySelector('.aria-chat-messages');
  const quick = root.querySelector('.aria-chat-quick');
  const form = root.querySelector('.aria-chat-form');
  const input = root.querySelector('.aria-chat-input');

  const addMessage = (text, who = 'bot') => {
    const row = document.createElement('div');
    row.className = `aria-chat-row ${who}`;
    const bubble = document.createElement('div');
    bubble.className = 'aria-chat-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  };

  const setQuickReplies = (items) => {
    quick.innerHTML = '';
    items.forEach((label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'aria-chat-chip';
      button.textContent = label;
      button.addEventListener('click', () => ask(label));
      quick.appendChild(button);
    });
  };

  const apartmentPrice = (text) => {
    const normalized = normalize(text).replace(/t\s*([1-5])/g, 't$1');
    const typeMatch = normalized.match(/\bt([1-5])\b/);
    const countMatch = normalized.match(/\b([2-7])\s*(?:diag|diagnostic)/);
    if (!typeMatch || !countMatch) return null;
    const typeIndex = Number(typeMatch[1]) - 1;
    const count = Number(countMatch[1]);
    return {
      type: TYPES[typeIndex],
      count,
      price: APPARTMENT_PACKS[count][typeIndex],
    };
  };

  const replyFor = (raw) => {
    const text = normalize(raw);
    const priced = apartmentPrice(raw);
    if (priced) {
      return `Pour un ${priced.type} avec ${priced.count} diagnostics, le tarif ARIA paramétré est de ${euro(priced.price)}.\nLe montant reste à confirmer selon le périmètre exact, les dépendances et les éventuelles options.`;
    }

    if (/bonjour|salut|hello|bonsoir/.test(text)) return 'Bonjour 👋 Je peux vous aider à identifier les diagnostics à prévoir, vous donner une indication tarifaire ou vous orienter vers ARIA Diagnostics.';

    if (/prix|tarif|combien|devis/.test(text)) {
      return 'Pour une estimation rapide d’un appartement, indiquez par exemple : « T1 5 diagnostics » ou « T3 3 diagnostics ».\nPour une maison ou un dossier particulier, ARIA vous confirme le tarif après vérification du bien.';
    }

    if (/vente|vendre/.test(text)) {
      return 'Pour une vente, la liste dépend notamment de l’année du bâtiment, de l’ancienneté des installations gaz/électricité, de la copropriété et de la localisation.\nExemples fréquents : DPE, amiante si permis antérieur à juillet 1997, plomb si logement antérieur à 1949, gaz/électricité si installations de plus de 15 ans, Carrez en copropriété et ERP.\nIndiquez-moi le type de bien, l’année approximative et la commune pour affiner.';
    }

    if (/location|louer|bail/.test(text)) {
      return 'Pour une location, les diagnostics varient selon le logement : DPE, électricité/gaz si installations de plus de 15 ans, plomb pour les logements anciens, ERP, et surface habitable Loi Boutin notamment.\nIndiquez-moi le type de bien et son année approximative pour affiner.';
    }

    if (/travaux|demolition|avant travaux|raat/.test(text)) {
      return 'Avant travaux ou démolition, un repérage amiante spécifique peut être nécessaire si le bâtiment est concerné. Un diagnostic amiante réalisé pour une vente ne remplace pas un repérage avant travaux.\nPour cadrer la mission, ARIA a besoin de l’adresse, de l’année du bâtiment et surtout du programme précis des travaux.';
    }

    if (/dpe|energie|energetique/.test(text)) {
      return 'ARIA Diagnostics réalise les DPE logements, immeubles et tertiaires. Le DPE réglementaire doit être établi à partir des caractéristiques du bien et des justificatifs disponibles.\nARIA Diagnostics ne réalise pas l’audit énergétique réglementaire.';
    }

    if (/amiante/.test(text)) return 'L’amiante concerne notamment les immeubles dont le permis de construire est antérieur au 1er juillet 1997. La mission diffère selon le contexte : vente, DAPP, DTA, avant travaux ou démolition.';
    if (/plomb|crep/.test(text)) return 'Le CREP concerne principalement les logements construits avant le 1er janvier 1949. Sa durée de validité dépend du résultat et du contexte vente/location.';
    if (/gaz/.test(text)) return 'Le diagnostic gaz est notamment requis en vente ou location lorsque l’installation intérieure de gaz a plus de 15 ans, sous réserve des cas réglementaires applicables.';
    if (/electricite|electrique/.test(text)) return 'Le diagnostic électricité est notamment requis en vente ou location lorsque l’installation intérieure a plus de 15 ans, sous réserve des cas réglementaires applicables.';
    if (/termite/.test(text)) return 'Le diagnostic termites dépend du zonage préfectoral applicable au bien. Sa validité est de 6 mois pour une vente.';
    if (/carrez/.test(text)) return 'Le mesurage Loi Carrez concerne la vente de lots de copropriété soumis à la réglementation, avec les exclusions prévues par les textes.';
    if (/boutin|surface habitable/.test(text)) return 'La surface habitable dite Loi Boutin est utilisée notamment en location. Elle ne se calcule pas comme une surface Carrez.';
    if (/assainissement|gpsea/.test(text)) return 'ARIA réalise des contrôles d’assainissement sur le territoire GPSEA lorsque l’adresse est éligible. L’éligibilité dépend de la commune et parfois de la rue : envoyez-nous l’adresse complète pour confirmation.';
    if (/contact|telephone|appeler|mail|email/.test(text)) return 'Vous pouvez joindre ARIA Diagnostics au 06 15 70 36 70 ou par e-mail à contact@aria-diagnostics.fr.';

    return 'Je peux vous aider sur : vente, location, DPE, amiante, plomb, gaz, électricité, termites, Carrez, Boutin, assainissement ou tarifs.\nPour une réponse plus précise, indiquez le type de bien, la commune et votre projet.';
  };

  const ask = (value) => {
    const question = String(value || '').trim();
    if (!question) return;
    addMessage(question, 'user');
    input.value = '';
    window.setTimeout(() => addMessage(replyFor(question), 'bot'), 120);
  };

  launcher.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) input.focus();
  });
  closer.addEventListener('click', () => panel.classList.remove('open'));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
  });

  addMessage('Bonjour 👋 Je suis l’assistant ARIA Diagnostics. Je peux vous aider à savoir quels diagnostics prévoir et vous donner une première indication de tarif.');
  setQuickReplies(['Vente', 'Location', 'Travaux', 'DPE', 'Tarifs', 'Assainissement']);
})();
