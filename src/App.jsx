import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, update, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAHvbKNECpqcvaFnrcLN6Yfo3ZbVI5AZo4",
  authDomain: "arribagev21.firebaseapp.com",
  databaseURL: "https://arribagev21-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "arribagev21",
  storageBucket: "arribagev21.firebasestorage.app",
  messagingSenderId: "440452496146",
  appId: "1:440452496146:web:585b700f23dbf18a88d1cb",
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const C = {
  bg:"#f0f4f1", header:"#111", white:"#ffffff",
  green:"#27ae60", greenDark:"#1a6b3a", greenLight:"#eafaf1",
  greenBorder:"#d4edda", text:"#2c3e50", textMuted:"#6b7c6e",
  pillBg:"#f4f7f5", pillText:"#1e8449", yellow:"#b8a000",
  red:"#fdedec", redText:"#c0392b", redBorder:"#f5c6cb",
  blue:"#eaf4fb", blueText:"#1a6fa8", blueBorder:"#b6d9f2",
  amber:"#fff8e6", amberText:"#7d5a00", amberBorder:"#ffe08a",
  orange:"#fff3e0", orangeText:"#e65100", orangeBorder:"#ffcc80",
};

const card    = { background:C.white, borderRadius:20, boxShadow:"0 4px 24px rgba(0,0,0,0.07)", overflow:"hidden", marginBottom:16 };
const cardTop = { background:"linear-gradient(135deg,#f0fff6,#e8f8ef)", borderBottom:`1px solid ${C.greenBorder}`, padding:"16px 20px" };
const cardBody= { padding:"16px 20px" };

const NOTE_LABELS = {1:"Insuffisant",2:"Passable",3:"Correct",4:"Bon",5:"Excellent"};
const NOTE_COLORS = {1:"#e74c3c",2:"#e67e22",3:"#f39c12",4:C.green,5:C.greenDark};
const NOTE_BG     = {1:"#fdf0ef",2:"#fef3ea",3:"#fef9ec",4:C.greenLight,5:"#d5f0e2"};

const INIT_FORM = {
  fournisseur:"", produit:"", variete:"",
  origine:"", quantite:"", unite:"colis", transporteur:"",
  temp_annoncee:"", commentaire:"", lot_interne:"", lot_fournisseur:"",
  poids_net:"", poids_colis:""
};

const INIT_CONTROLE = {
  qualite:0, temperature:"", poids_colis_mesure:"",
  quantite_ok:null, quantite_corrigee:"",
  ggn:false, num_lot:false, origine_ok:false,
  reserve_raison:"", reserve_pct:"", reserve_photos:"",
  refus_raison:"", refus_pct:"", refus_photos:"",
  lot_fournisseur_litige:"", heure_agreage:""
};

const ROLES = [
  { id:"acheteur", icon:"🛒", label:"Acheteur" },
  { id:"agréeur",  icon:"✅", label:"Agréeur"  },
  { id:"manager",  icon:"📊", label:"Manager"  },
];

// ── SHARED UI COMPONENTS ──────────────────────────────────────────────────────

function Logo() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, userSelect:"none" }}>
      <span style={{ fontWeight:700, fontSize:22, color:"#fff", letterSpacing:"-0.5px" }}>m</span>
      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:22, height:22, borderRadius:"50%", border:`2.5px solid ${C.yellow}`, fontWeight:700, fontSize:14, color:"#fff", lineHeight:1 }}>o</span>
      <span style={{ fontWeight:700, fontSize:22, color:"#fff", letterSpacing:"-0.5px" }}>orea</span>
      <span style={{ marginLeft:10, fontSize:12, color:"#aaa", fontWeight:400, borderLeft:"1px solid #333", paddingLeft:10 }}>Rungis</span>
    </div>
  );
}

function Badge({ status }) {
  const map = {
    "validé":       { bg:C.greenLight, color:C.greenDark, border:C.greenBorder, dot:C.green,   label:"Validé" },
    "refusé":       { bg:C.red,        color:C.redText,   border:C.redBorder,   dot:C.redText, label:"Refus litige" },
    "sous réserve": { bg:"#fff8e6",    color:"#7d5a00",   border:"#ffe08a",     dot:"#e6a817", label:"Sous réserve" },
    "en attente":   { bg:C.amber,      color:C.amberText, border:C.amberBorder, dot:"#e6a817", label:"En attente" },
  };
  const s = map[status] || map["en attente"];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:s.bg, color:s.color, border:`1px solid ${s.border}`, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:20 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }}/>
      {s.label}
    </span>
  );
}

function Pill({ children, color }) {
  return <span style={{ background:color?color+"22":C.pillBg, border:`1px solid ${color?color+"44":C.greenBorder}`, color:color||C.pillText, fontSize:12, fontWeight:500, padding:"3px 10px", borderRadius:20 }}>{children}</span>;
}

function NoteBtn({ n, selected, onChange }) {
  const active = selected === n;
  const [hov, setHov] = useState(false);
  return (
    <button onClick={() => onChange(n)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width:42, height:42, borderRadius:10, cursor:"pointer", fontSize:14, fontWeight:active?700:400,
        border:`1.5px solid ${active?NOTE_COLORS[n]:hov?C.green:C.greenBorder}`,
        background:active?NOTE_BG[n]:hov?C.greenLight:C.white,
        color:active?NOTE_COLORS[n]:hov?C.green:C.textMuted, transition:"all 0.12s" }}>
      {n}
    </button>
  );
}

function Section({ title, icon, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...card, marginBottom:12 }}>
      <button onClick={() => setOpen(!open)} style={{ width:"100%", ...cardTop, display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", border:"none", textAlign:"left", borderRadius:open?"0":"20px" }}>
        <span style={{ fontWeight:600, fontSize:14, color:C.greenDark, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>{icon}</span>{title}
        </span>
        <span style={{ color:C.greenDark, fontSize:12 }}>{open?"▲":"▼"}</span>
      </button>
      {open && <div style={cardBody}>{children}</div>}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:600, color:C.textMuted, display:"block", marginBottom:5, letterSpacing:"0.03em", textTransform:"uppercase" }}>
        {label}{required && <span style={{ color:"#e74c3c", marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background:C.white, borderRadius:14, padding:"14px 16px", flex:1, boxShadow:"0 2px 12px rgba(0,0,0,0.05)", borderTop:`3px solid ${color||C.greenBorder}` }}>
      <p style={{ margin:"0 0 4px", fontSize:12, color:C.textMuted, fontWeight:500 }}>{label}</p>
      <p style={{ margin:0, fontSize:24, fontWeight:700, color:color||C.greenDark }}>{value}</p>
      {sub && <p style={{ margin:"2px 0 0", fontSize:11, color:C.textMuted }}>{sub}</p>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position:"relative" }}>
      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, pointerEvents:"none" }}>🔍</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Rechercher..."} style={{ border:`1px solid ${C.greenBorder}`, borderRadius:10, padding:"9px 12px 9px 36px", fontSize:14, color:C.text, background:C.white, width:"100%", boxSizing:"border-box", outline:"none", fontFamily:"'Segoe UI',system-ui,sans-serif" }}/>
      {value && <button onClick={()=>onChange("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:18, color:C.textMuted, lineHeight:1 }}>×</button>}
    </div>
  );
}

// Popup modal
function Modal({ title, children, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:440, boxShadow:"0 8px 40px rgba(0,0,0,0.18)", overflow:"hidden" }}>
        <div style={{ ...cardTop, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:700, fontSize:15, color:C.greenDark }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:C.textMuted, lineHeight:1 }}>×</button>
        </div>
        <div style={cardBody}>{children}</div>
      </div>
    </div>
  );
}

// ── FILTER BAR (multi-criteria) ───────────────────────────────────────────────
function FilterBar({ filters, onChange, inputStyle }) {
  return (
    <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
      <SearchBar value={filters.produit} onChange={v=>onChange({...filters,produit:v})} placeholder="🥦 Produit"/>
      <input value={filters.fournisseur||""} onChange={e=>onChange({...filters,fournisseur:e.target.value})} placeholder="🏭 Fournisseur" style={{...inputStyle, width:160}}/>
      <input value={filters.origine||""} onChange={e=>onChange({...filters,origine:e.target.value})} placeholder="🌍 Origine" style={{...inputStyle, width:130}}/>
      {(filters.produit||filters.fournisseur||filters.origine) &&
        <button onClick={()=>onChange({produit:"",fournisseur:"",origine:"",statut:filters.statut||"tous"})} style={{ padding:"8px 12px", borderRadius:10, cursor:"pointer", fontSize:12, fontWeight:600, background:C.red, color:C.redText, border:`1px solid ${C.redBorder}` }}>✕ Effacer</button>
      }
    </div>
  );
}

function applyFilters(list, f) {
  return list.filter(a => {
    if(f.produit    && !a.produit?.toLowerCase().includes(f.produit.toLowerCase()))       return false;
    if(f.fournisseur&& !a.fournisseur?.toLowerCase().includes(f.fournisseur.toLowerCase()))return false;
    if(f.origine    && !a.origine?.toLowerCase().includes(f.origine.toLowerCase()))       return false;
    if(f.statut && f.statut!=="tous" && a.statut !== f.statut)                             return false;
    return true;
  });
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const authUser = { uid: "default" };
  const userInfo = { prenom: "Moorea", nom: "", role: "manager" };

  const [managerMode, setManagerMode] = useState("dashboard");
  const [page, setPage]             = useState("saisie");
  const [arrivages, setArrivages]   = useState([]);
  const [dbLoading, setDbLoading]   = useState(false);
  const [form, setForm]             = useState(INIT_FORM);
  const [selected, setSelected]     = useState(null);
  const [notes, setNotes]           = useState(INIT_CONTROLE);
  const [decision, setDecision]     = useState("");
  const [obsAgr, setObsAgr]         = useState("");
  const [toast, setToast]           = useState(null);
  const [importing, setImporting]   = useState(false);
  const [importMode, setImportMode]   = useState("excel");
  const [selectedFourn, setSelectedFourn] = useState(null);
  const [search, setSearch] = useState("");
  const [preview, setPreview]       = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [agreeMode, setAgreeMode]   = useState(false);
  const [photoModal, setPhotoModal] = useState(null); // "reserve"|"refus" — popup si photo manquante
  const [pendingDecision, setPendingDecision] = useState(null); // save before popup
  const [horsListeMode, setHorsListeMode] = useState(false);
  const INIT_HORS_LISTE = { produit:"", variete:"", fournisseur:"", lot_interne:"", lot_fournisseur_litige:"", origine:"", quantite:"", unite:"colis", poids_colis:"", poids_mesure:"", transporteur:"", temp_annoncee:"", temperature:"", decision:"refusé", raison:"", pct:"", photos:"", qualite:0, observations:"" };
  const [horsListe, setHorsListe] = useState(INIT_HORS_LISTE);

  // Filters state
  const INIT_FILTERS = { produit:"", fournisseur:"", origine:"", statut:"tous" };
  const [filters, setFilters]       = useState(INIT_FILTERS);



  useEffect(() => {
    const unsub = onValue(ref(db,"arrivages"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id,val])=>({...val,id}));
        list.sort((a,b)=>b.timestamp-a.timestamp);
        setArrivages(list);
      } else setArrivages([]);
      setDbLoading(false);
    });
    return () => unsub();
  }, []);

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const inputStyle = { border:`1px solid ${C.greenBorder}`, borderRadius:10, padding:"9px 12px", fontSize:14, color:C.text, background:C.white, width:"100%", boxSizing:"border-box", outline:"none", fontFamily:"'Segoe UI',system-ui,sans-serif" };

  const Toast = () => toast ? (
    <div style={{ position:"fixed", top:16, right:16, zIndex:1100, background:toast.type==="err"?C.red:C.greenLight, color:toast.type==="err"?C.redText:C.greenDark, border:`1px solid ${toast.type==="err"?C.redBorder:C.greenBorder}`, borderRadius:12, padding:"12px 20px", fontWeight:600, fontSize:14, boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>{toast.msg}</div>
  ) : null;



  // ── DERIVED ──────────────────────────────────────────────────────────────────
  const enAttente = arrivages.filter(a=>a.statut==="en attente");
  const traites   = arrivages.filter(a=>a.statut!=="en attente");
  const role      = userInfo?.role;
  const displayName = userInfo ? `${userInfo.prenom} ${userInfo.nom}` : "";

  // ── ACTIONS ──────────────────────────────────────────────────────────────────
  const submitArrivage = async () => {
    if (!form.fournisseur||!form.produit||!form.quantite) { showToast("Remplissez les champs obligatoires","err"); return; }
    const now = new Date();
    await push(ref(db,"arrivages"), {
      ...form,
      statut:"en attente", acheteur:"Moorea", acheteurId:"default",
      date:now.toLocaleDateString("fr-FR"), timestamp:Date.now(), notes:{}, obsAgr:""
    });
    setForm(INIT_FORM);
    showToast("Arrivage enregistré ✓");
  };

  const deleteArrivage = async (id) => {
    if (!window.confirm("Supprimer cet arrivage ?")) return;
    await remove(ref(db,`arrivages/${id}`));
    showToast("Arrivage supprimé");
    if (selectedLot?.id===id) setSelectedLot(null);
  };

  const deleteAll = async () => {
    if (!window.confirm("Supprimer TOUS les arrivages ?")) return;
    await remove(ref(db,"arrivages"));
    showToast("Tous les arrivages supprimés");
  };

  // Import Excel (format Geslot Moorea)
  const handleExcelImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
        const wb = XLSX.read(ev.target.result, {type:'array', cellDates:true});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
        
        const arr = [];
        let lot = "", fournisseur = "", date = "";
        
        for (let i = 0; i < raw.length; i++) {
          const row = raw[i];
          const colA = String(row[0] || '').trim();
          const colB = String(row[1] || '').trim();
          const colC = String(row[2] || '').trim();
          const colE = String(row[4] || '').trim();
          const colF = row[5];
          const colI = row[8];

          // Ligne de lot : colB = "Lot", colC = numéro, colE = fournisseur
          if (colB === 'Lot' && colC) {
            lot = colC;
            fournisseur = colE;
            continue;
          }

          // Ligne date arrivée
          if (colB === 'Date arrivée' && row[2]) {
            if (row[2] instanceof Date) {
              const d = row[2];
              date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            } else {
              const dm = String(row[2]).match(/(\d{2}\/\d{2}\/\d{4})/);
              if (dm) date = dm[1];
            }
            continue;
          }

          // Ignorer lignes header/totaux
          if (!colA || colB === 'Numero S/lot' || colB === 'Totaux' || 
              colA.startsWith('Article') || colC === 'libelle article') continue;

          // Ligne produit : colA = code article, colC = libellé, colF = nb colis
          if (colA && colC && colF && lot) {
            const nbColis = parseInt(colF) || 0;
            const poids = colI ? String(colI) : "";
            if (colC.length > 2 && nbColis > 0) {
              arr.push({
                lot_interne: lot,
                lot_fournisseur: "",
                fournisseur,
                date,
                produit: colC,
                variete: "",
                origine: "",
                quantite: String(nbColis),
                unite: "colis",
                poids_net: poids,
                poids_colis: "",
                transporteur: "",
                temp_annoncee: "",
                commentaire: colA ? `Code: ${colA}` : "",
              });
            }
          }
        }
        
        if (arr.length === 0) { showToast("Aucun arrivage détecté","err"); setImporting(false); return; }
        setPreview(arr);
        setImporting(false);
      } catch(err) { showToast("Erreur : " + err.message, "err"); setImporting(false); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const confirmImport = async () => {
    if(!preview)return;
    setImporting(true);
    const now=new Date();
    for(const a of preview){
      await push(ref(db,"arrivages"),{...a,statut:"en attente",acheteur:"Moorea",acheteurId:"default",date:a.date||now.toLocaleDateString("fr-FR"),timestamp:Date.now(),notes:{},obsAgr:""});
    }
    setPreview(null); setImporting(false); setPage("dashboard");
    showToast(`${preview.length} arrivages importés ✓`);
  };

  // Validation agrément — with photo-missing popup
  const attemptValidation = (targetId) => {
    const id = targetId || selected?.id;
    if (!decision) { showToast("Choisissez une décision","err"); return; }
    if (!notes.qualite) { showToast("Notez la qualité visuelle","err"); return; }
    
    // Résoudre la décision finale
    const decisionFinale = decision === "validé" ? "validé" : notes.decision_type || decision;
    
    if ((decisionFinale==="sous réserve"||decisionFinale==="refusé") && !notes.lot_fournisseur_litige) {
      showToast("Saisissez le N° lot fournisseur","err"); return;
    }
    if ((decisionFinale==="sous réserve"&&!notes.reserve_photos)||(decisionFinale==="refusé"&&!notes.refus_photos)) {
      setPendingDecision({id, decision: decisionFinale});
      setPhotoModal(decisionFinale==="sous réserve"?"reserve":"refus");
      return;
    }
    doSubmitValidation(id, decisionFinale);
  };

  const EMAILJS_SERVICE  = "service_sn0c5to";
  const EMAILJS_TEMPLATE = "template_jbohy0p";
  const EMAILJS_PUBKEY   = "ZwcIMzI6JE0IkLZ8O";
  const QUALITE_EMAIL    = "moorea.ifco@gmail.com";

  const sendLitigeEmail = async (arrivage, notesData, decisionVal, obsAgrVal) => {
    try {
      // Charge EmailJS dynamiquement
      if (!window.emailjs) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
        window.emailjs.init(EMAILJS_PUBKEY);
      }

      // Historique fournisseur
      const fournStats = arrivages.filter(a=>a.fournisseur===arrivage.fournisseur);
      const histTotal    = fournStats.length;
      const histValides  = fournStats.filter(a=>a.statut==="validé").length;
      const histReserves = fournStats.filter(a=>a.statut==="sous réserve").length;
      const histRefuses  = fournStats.filter(a=>a.statut==="refusé").length;

      // Couleurs décision
      const isRefus = decisionVal==="refusé";
      const decisionBg     = isRefus ? "#fdedec" : "#fff8e6";
      const decisionBorder = isRefus ? "#f5c6cb" : "#ffe08a";
      const decisionColor  = isRefus ? "#c0392b" : "#7d5a00";
      const decisionLabel  = isRefus ? "❌ Refus litige" : "⚠️ Sous réserve";
      const raison         = isRefus ? (notesData.refus_raison||"—") : (notesData.reserve_raison||"—");
      const pct            = isRefus ? (notesData.refus_pct||"0") : (notesData.reserve_pct||"0");

      // Couleur note qualité
      const noteColors = {1:"#e74c3c",2:"#e67e22",3:"#f39c12",4:"#27ae60",5:"#1a6b3a"};
      const noteLabels = {1:"Insuffisant",2:"Passable",3:"Correct",4:"Bon",5:"Excellent"};
      const noteColor  = noteColors[notesData.qualite] || "#888";
      const noteLabel  = noteLabels[notesData.qualite] || "—";

      // Température
      const tempVal    = parseFloat(notesData.temperature||0);
      const tempColor  = tempVal>15 ? "#e65100" : "#1a6fa8";
      const tempStatus = tempVal>15 ? "⚠️ Hors norme" : "Conforme";

      // Conformité docs
      const ok = (v) => v ? "#eafaf1" : "#fdedec";
      const okC= (v) => v ? "#1a6b3a" : "#c0392b";
      const okL= (v) => v ? "✓ Conforme" : "✗ Absent";

      const params = {
        to_email:       QUALITE_EMAIL,
        date_rapport:   new Date().toLocaleDateString("fr-FR", {day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}),
        produit:        arrivage.produit || "—",
        variete:        arrivage.variete || "",
        fournisseur:    arrivage.fournisseur || "—",
        lot_interne:    arrivage.lot_interne || "—",
        lot_fournisseur:notesData.lot_fournisseur_litige || arrivage.lot_fournisseur || "—",
        origine:        arrivage.origine || "—",
        quantite:       arrivage.quantite || "—",
        unite:          arrivage.unite || "colis",
        poids_colis:    arrivage.poids_colis || "—",
        transporteur:   arrivage.transporteur || "—",
        decision_label: decisionLabel,
        decision_bg:    decisionBg,
        decision_border:decisionBorder,
        decision_color: decisionColor,
        raison_litige:  raison,
        statut_pct:     pct,
        note_qualite:   notesData.qualite || "—",
        note_label:     noteLabel,
        note_color:     noteColor,
        temperature:    notesData.temperature || "—",
        temp_color:     tempColor,
        temp_status:    tempStatus,
        poids_mesure:   notesData.poids_colis_mesure ? notesData.poids_colis_mesure+" kg" : "—",
        poids_annonce:  arrivage.poids_colis || "—",
        ggn_bg:         ok(notesData.ggn), ggn_color: okC(notesData.ggn), ggn_status: okL(notesData.ggn),
        lot_bg:         ok(notesData.num_lot), lot_color: okC(notesData.num_lot), lot_status: okL(notesData.num_lot),
        origine_bg:     ok(notesData.origine_ok), origine_color: okC(notesData.origine_ok), origine_status: okL(notesData.origine_ok),
        qte_bg:         ok(notesData.quantite_ok!==false), qte_color: okC(notesData.quantite_ok!==false), qte_status: notesData.quantite_ok===false?`✗ Corrigée : ${notesData.quantite_corrigee}`:"✓ Correcte",
        observations:   obsAgrVal || "Aucune observation.",
        hist_total:     histTotal,
        hist_valides:   histValides,
        hist_reserves:  histReserves,
        hist_refuses:   histRefuses,
        acheteur:       arrivage.acheteur || "—",
        agreeur:        displayName,
        heure_agreage:  notesData.heure_agreage || new Date().toTimeString().slice(0,5),
      };

      await window.emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, params);
      showToast("📧 Rapport envoyé au service qualité ✓");
    } catch(err) {
      console.error("EmailJS error:", err);
      showToast("⚠️ Email non envoyé — litige enregistré quand même","err");
    }
  };

  const doSubmitValidation = async (id, decisionFinale) => {
    const finalDecision = decisionFinale || (decision === "validé" ? "validé" : notes.decision_type || decision);
    const heureAgreage = notes.heure_agreage || new Date().toTimeString().slice(0,5);
    const arrivage = arrivages.find(a=>a.id===id) || selected || selectedLot;
    await update(ref(db,`arrivages/${id}`),{
      statut:decision, notes:{...notes,heure_agreage:heureAgreage},
      obsAgr, agréeur:displayName, agréeurId:authUser.uid, validatedAt:Date.now()
    });

    // Envoyer email automatique si litige
    if (decision==="refusé" || decision==="sous réserve") {
      await sendLitigeEmail(arrivage, {...notes,heure_agreage:heureAgreage}, decision, obsAgr);
    }

    setSelected(null); setNotes(INIT_CONTROLE); setDecision(""); setObsAgr("");
    setAgreeMode(false); setSelectedLot(null); setPhotoModal(null); setPendingDecision(null);
    showToast(decision==="validé"?"Validé ✓":decision==="sous réserve"?"Sous réserve enregistré":"Refus litige enregistré");
  };

  const confirmWithoutPhoto = () => {
    if (pendingDecision) doSubmitValidation(pendingDecision.id);
  };

  const submitHorsListe = async () => {
    if (!horsListe.produit||!horsListe.fournisseur||!horsListe.raison) {
      showToast("Remplissez produit, fournisseur et raison","err"); return;
    }
    if (!horsListe.lot_fournisseur_litige) {
      showToast("Saisissez le N° lot fournisseur","err"); return;
    }
    const now = new Date();
    const heureAgreage = now.toTimeString().slice(0,5);
    const fakeArrivage = {
      ...horsListe,
      lot_fournisseur: horsListe.lot_fournisseur_litige,
      acheteur: "— (hors liste)",
      date: now.toLocaleDateString("fr-FR"),
      statut: horsListe.decision,
      hors_liste: true,
    };
    // Save in Firebase
    await push(ref(db,"arrivages"), {
      ...fakeArrivage,
      agréeur: displayName, agréeurId: authUser.uid,
      timestamp: Date.now(),
      validatedAt: Date.now(),
      notes: {
        qualite: horsListe.qualite,
        temperature: horsListe.temperature,
        poids_colis_mesure: horsListe.poids_mesure,
        lot_fournisseur_litige: horsListe.lot_fournisseur_litige,
        [horsListe.decision==="refusé"?"refus_raison":"reserve_raison"]: horsListe.raison,
        [horsListe.decision==="refusé"?"refus_pct":"reserve_pct"]: horsListe.pct,
        [horsListe.decision==="refusé"?"refus_photos":"reserve_photos"]: horsListe.photos,
        heure_agreage: heureAgreage,
      },
      obsAgr: horsListe.observations,
    });
    // Send email
    const notesForEmail = {
      qualite: horsListe.qualite, temperature: horsListe.temperature,
      poids_colis_mesure: horsListe.poids_mesure,
      lot_fournisseur_litige: horsListe.lot_fournisseur_litige,
      refus_raison: horsListe.decision==="refusé"?horsListe.raison:"",
      reserve_raison: horsListe.decision==="sous réserve"?horsListe.raison:"",
      refus_pct: horsListe.decision==="refusé"?horsListe.pct:"",
      reserve_pct: horsListe.decision==="sous réserve"?horsListe.pct:"",
      refus_photos: horsListe.photos, reserve_photos: horsListe.photos,
      ggn:false, num_lot:false, origine_ok:false, quantite_ok:null,
      heure_agreage: heureAgreage,
    };
    const savedDecision = decision;
    // Temporarily set decision for email
    await sendLitigeEmail(fakeArrivage, notesForEmail, horsListe.decision, horsListe.observations);
    setHorsListeMode(false);
    setHorsListe(INIT_HORS_LISTE);
    showToast("Rapport hors liste enregistré et envoyé ✓");
  };

  const keepPending = () => {
    // Save as "en attente" but keep notes partially
    setPhotoModal(null); setPendingDecision(null);
    showToast("Agrément conservé en attente — ajoutez la photo","ok");
  };




  // ── SHARED LAYOUT COMPONENTS ─────────────────────────────────────────────────

  const Header = ({ extraNav }) => (
    <div style={{background:C.header,height:72,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.18)",marginBottom:24}}>
      <Logo/>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        {extraNav}
        <div style={{textAlign:"right"}}>
          <p style={{margin:0,fontSize:13,fontWeight:600,color:"#fff"}}>{displayName}</p>
          <p style={{margin:0,fontSize:11,color:"#aaa",textTransform:"capitalize"}}>{role}</p>
        </div>
        <div style={{width:36,height:36,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff"}}>{displayName.slice(0,2).toUpperCase()}</div>
        
      </div>
    </div>
  );

  const BackManagerBtn = () => (
    <button onClick={()=>setManagerMode("dashboard")} style={{padding:"9px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,border:`2px solid ${C.greenBorder}`,background:C.white,color:C.textMuted,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>← Back Manager</button>
  );

  const NavTabs = ({ extra }) => (
    <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
      {[{id:"saisie",label:"➕ Nouvel arrivage"},{id:"import",label:"📊 Import Excel"},{id:"suivi",label:`📋 Suivi${enAttente.length>0?" · "+enAttente.length:""}`}].map(t=>(
        <button key={t.id} onClick={()=>setPage(t.id)} style={{padding:"9px 20px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600,border:`2px solid ${page===t.id?C.green:C.greenBorder}`,background:page===t.id?C.green:C.white,color:page===t.id?"#fff":C.textMuted,fontFamily:"'Segoe UI',system-ui,sans-serif",transition:"all 0.15s"}}>{t.label}</button>
      ))}
      {extra}
    </div>
  );

  // ── SAISIE FORM (acheteur + manager acheteur mode) ────────────────────────────

  const SaisieForm = () => (
    <>
      <Section title="Identification" icon="🏷️" defaultOpen>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
          <Field label="Fournisseur" required><input value={form.fournisseur} onChange={e=>setForm({...form,fournisseur:e.target.value})} placeholder="Ex : PICVERT" style={inputStyle}/></Field>
          <Field label="N° Lot interne (feuille arrivage)"><input value={form.lot_interne} onChange={e=>setForm({...form,lot_interne:e.target.value})} placeholder="Ex : 20240401-01" style={inputStyle}/></Field>
          <Field label="N° Lot fournisseur"><input value={form.lot_fournisseur} onChange={e=>setForm({...form,lot_fournisseur:e.target.value})} placeholder="Ex : 26032146" style={inputStyle}/></Field>
          <Field label="Produit" required><input value={form.produit} onChange={e=>setForm({...form,produit:e.target.value})} placeholder="Ex : Tomate grappe" style={inputStyle}/></Field>
          <Field label="Variété"><input value={form.variete} onChange={e=>setForm({...form,variete:e.target.value})} placeholder="Ex : Barquette 400g" style={inputStyle}/></Field>
          <Field label="Origine"><input value={form.origine} onChange={e=>setForm({...form,origine:e.target.value})} placeholder="Ex : Espagne" style={inputStyle}/></Field>
        </div>
      </Section>

      <Section title="Quantité & poids" icon="📦">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
          <Field label="Quantité" required>
            <div style={{display:"flex",gap:8}}>
              <input type="number" value={form.quantite} onChange={e=>setForm({...form,quantite:e.target.value})} placeholder="0" style={{...inputStyle,flex:1}}/>
              <select value={form.unite} onChange={e=>setForm({...form,unite:e.target.value})} style={{...inputStyle,width:90}}>
                <option>colis</option><option>kg</option><option>tonne</option><option>palette</option>
              </select>
            </div>
          </Field>
          <Field label="Poids net total (kg)"><input type="number" value={form.poids_net} onChange={e=>setForm({...form,poids_net:e.target.value})} placeholder="Ex : 112" style={inputStyle}/></Field>
          <Field label="Poids par barquette / colis (kg)"><input type="number" step="0.01" value={form.poids_colis} onChange={e=>setForm({...form,poids_colis:e.target.value})} placeholder="Ex : 0.400" style={inputStyle}/></Field>
          <Field label="Temp. annoncée (°C)"><input type="number" value={form.temp_annoncee} onChange={e=>setForm({...form,temp_annoncee:e.target.value})} placeholder="Ex : 4" style={inputStyle}/></Field>
          <Field label="Transporteur"><input value={form.transporteur} onChange={e=>setForm({...form,transporteur:e.target.value})} placeholder="Ex : Transgourmet" style={inputStyle}/></Field>
        </div>
      </Section>

      <Section title="Commentaire" icon="💬" defaultOpen={false}>
        <textarea value={form.commentaire} onChange={e=>setForm({...form,commentaire:e.target.value})} placeholder="Remarques acheteur..." rows={3} style={{...inputStyle,resize:"vertical"}}/>
      </Section>

      <button onClick={submitArrivage} style={{width:"100%",padding:"14px",background:C.green,color:"#fff",border:"none",borderRadius:14,fontWeight:700,cursor:"pointer",fontSize:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        Enregistrer l'arrivage →
      </button>
    </>
  );

  // ── AGRÉMENT FORM SIMPLIFIÉ ──────────────────────────────────────────────────

  const AgrémentForm = ({ arrivage, onBack, onSubmit }) => {
    const tempAlert = notes.temperature && parseFloat(notes.temperature) > 15;

    return (
      <div style={{maxWidth:720,margin:"0 auto",padding:"0 20px 40px"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textMuted,fontSize:14,padding:"0 0 16px",display:"flex",alignItems:"center",gap:4}}>‹ Retour</button>

        {/* Recap lot */}
        <div style={card}>
          <div style={cardTop}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <p style={{margin:"0 0 6px",fontWeight:700,fontSize:20,color:C.greenDark}}>{arrivage.produit}{arrivage.variete&&` · ${arrivage.variete}`}</p>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Pill>🏭 {arrivage.fournisseur}</Pill>
                  {arrivage.lot_interne&&<Pill>🔖 {arrivage.lot_interne}</Pill>}
                  <Pill>📦 {arrivage.quantite} {arrivage.unite}</Pill>
                  {arrivage.origine&&<Pill>🌍 {arrivage.origine}</Pill>}
                  {arrivage.date&&<Pill>📅 {arrivage.date}</Pill>}
                </div>
              </div>
              <Badge status={arrivage.statut}/>
            </div>
            {arrivage.commentaire&&<div style={{background:C.blue,border:`1px solid ${C.blueBorder}`,borderRadius:8,padding:"8px 12px"}}><p style={{margin:0,fontSize:13,color:C.blueText,fontStyle:"italic"}}>💬 {arrivage.commentaire}</p></div>}
          </div>
        </div>

        {/* Note qualité */}
        <div style={{...card,padding:0}}>
          <div style={{...cardTop}}>
            <p style={{margin:"0 0 12px",fontWeight:700,fontSize:15,color:C.text}}>👁 Note qualité visuelle</p>
            <div style={{display:"flex",gap:8}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setNotes({...notes,qualite:n})} style={{
                  flex:1, padding:"14px 0", borderRadius:12, cursor:"pointer",
                  fontWeight:700, fontSize:18,
                  background: notes.qualite===n ? NOTE_COLORS[n] : C.white,
                  color: notes.qualite===n ? "#fff" : NOTE_COLORS[n],
                  border: `2px solid ${NOTE_COLORS[n]}`,
                  fontFamily:"'Segoe UI',system-ui,sans-serif",
                  transition:"all 0.15s"
                }}>{n}</button>
              ))}
            </div>
            {notes.qualite>0&&<p style={{margin:"10px 0 0",fontSize:13,fontWeight:600,color:NOTE_COLORS[notes.qualite],textAlign:"center"}}>{NOTE_LABELS[notes.qualite]}</p>}
          </div>
        </div>

        {/* Température */}
        <div style={{...card,padding:0}}>
          <div style={{...cardTop,background:tempAlert?"#fff3e0":undefined,border:tempAlert?`1px solid ${C.orangeBorder}`:undefined}}>
            <p style={{margin:"0 0 10px",fontWeight:700,fontSize:15,color:tempAlert?C.orangeText:C.text}}>🌡 Température mesurée {tempAlert&&"⚠️"}</p>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="number" value={notes.temperature} onChange={e=>setNotes({...notes,temperature:e.target.value})}
                placeholder="Ex : 4" style={{...inputStyle,width:120,borderColor:tempAlert?C.orangeBorder:C.greenBorder}}/>
              <span style={{fontSize:16,color:C.textMuted}}>°C</span>
              {arrivage.temp_annoncee&&<span style={{fontSize:12,color:C.blueText,background:C.blue,border:`1px solid ${C.blueBorder}`,padding:"3px 10px",borderRadius:20}}>Annoncée : {arrivage.temp_annoncee}°C</span>}
            </div>
            {tempAlert&&<p style={{margin:"8px 0 0",fontSize:13,color:C.orangeText,fontWeight:600}}>⚠️ Température > 15°C — produits hors norme !</p>}
          </div>
        </div>

        {/* Décision */}
        <div style={card}>
          <div style={cardBody}>
            <p style={{margin:"0 0 14px",fontWeight:700,fontSize:15,color:C.text}}>📋 Décision</p>
            <div style={{display:"flex",gap:12,marginBottom:16}}>
              <button onClick={()=>setDecision("validé")} style={{
                flex:1, padding:"18px", borderRadius:14, cursor:"pointer",
                fontWeight:700, fontSize:16,
                background: decision==="validé" ? C.green : C.greenLight,
                color: decision==="validé" ? "#fff" : C.greenDark,
                border: `2px solid ${decision==="validé" ? C.green : C.greenBorder}`,
                fontFamily:"'Segoe UI',system-ui,sans-serif",
                boxShadow: decision==="validé" ? "0 4px 12px rgba(39,174,96,0.3)" : "none"
              }}>✅ Conforme</button>
              <button onClick={()=>setDecision("non_conforme")} style={{
                flex:1, padding:"18px", borderRadius:14, cursor:"pointer",
                fontWeight:700, fontSize:16,
                background: decision==="non_conforme" ? C.redText : C.red,
                color: decision==="non_conforme" ? "#fff" : C.redText,
                border: `2px solid ${decision==="non_conforme" ? C.redText : C.redBorder}`,
                fontFamily:"'Segoe UI',system-ui,sans-serif",
                boxShadow: decision==="non_conforme" ? "0 4px 12px rgba(192,57,43,0.3)" : "none"
              }}>❌ Non conforme</button>
            </div>

            {/* Si non conforme → redirection vers moorea-qualite */}
            {decision==="non_conforme"&&(
              <div style={{background:C.red,border:`1px solid ${C.redBorder}`,borderRadius:14,padding:"16px",marginBottom:16}}>
                <p style={{margin:"0 0 10px",fontWeight:700,fontSize:14,color:C.redText}}>❌ Non conforme — Créer un rapport qualité</p>
                <div style={{background:"rgba(255,255,255,0.6)",borderRadius:10,padding:"12px",marginBottom:14,fontSize:13,color:C.text}}>
                  <p style={{margin:"0 0 4px",fontWeight:600}}>📦 {arrivage.produit}</p>
                  <p style={{margin:"0 0 4px",color:C.textMuted}}>🏭 {arrivage.fournisseur} · 🔖 Lot {arrivage.lot_interne} · 📦 {arrivage.quantite} {arrivage.unite}</p>
                  {arrivage.origine&&<p style={{margin:0,color:C.textMuted}}>🌍 {arrivage.origine}</p>}
                </div>
                <button onClick={()=>{
                  const params = new URLSearchParams({
                    produit: arrivage.produit || '',
                    fournisseur: arrivage.fournisseur || '',
                    lot: arrivage.lot_interne || '',
                    quantite: arrivage.quantite || '',
                    unite: arrivage.unite || '',
                    origine: arrivage.origine || '',
                    temperature: notes.temperature || '',
                    qualite: notes.qualite || '',
                  });
                  window.open(`https://moorea-qualite.vercel.app/?${params.toString()}`, '_blank');
                }} style={{
                  width:"100%", padding:"14px", background:C.redText, color:"#fff",
                  border:"none", borderRadius:12, fontWeight:700, cursor:"pointer",
                  fontSize:15, fontFamily:"'Segoe UI',system-ui,sans-serif",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8
                }}>
                  📋 Ouvrir le formulaire de rapport qualité →
                </button>
              </div>
            )}

            {/* Observations */}
            <Field label="Observations (optionnel)">
              <textarea value={obsAgr} onChange={e=>setObsAgr(e.target.value)}
                placeholder="Remarques complémentaires..." rows={2}
                style={{...inputStyle,resize:"vertical",marginBottom:0}}/>
            </Field>

            <button onClick={()=>onSubmit(arrivage.id)} disabled={!decision || (decision==="non_conforme" && !notes.decision_type)}
              style={{width:"100%",padding:"16px",
                background: !decision || (decision==="non_conforme"&&!notes.decision_type) ? "#ccc" :
                  decision==="validé" ? C.green :
                  notes.decision_type==="refusé" ? C.redText : "#e6a817",
                color:"#fff",border:"none",borderRadius:14,fontWeight:700,cursor:!decision||(decision==="non_conforme"&&!notes.decision_type)?"not-allowed":"pointer",
                fontSize:16,fontFamily:"'Segoe UI',system-ui,sans-serif",marginTop:4}}>
              {decision==="validé" ? "✅ Confirmer — Conforme" :
               decision==="non_conforme" && notes.decision_type==="sous réserve" ? "⚠️ Confirmer — Sous réserve" :
               decision==="non_conforme" && notes.decision_type==="refusé" ? "❌ Confirmer — Refus" :
               "Choisir une décision"}
            </button>
          </div>
        </div>
      </div>
    );
  };

    // ── FICHE LOT ─────────────────────────────────────────────────────────────────

  const FicheLot = ({ a, onBack, isManager }) => (
    <div style={{maxWidth:800,margin:"0 auto",padding:"0 20px 40px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:16}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",cursor:"pointer",color:C.textMuted,fontSize:14,display:"flex",alignItems:"center",gap:4}}>‹ Retour</button>
        {isManager&&(
          <div style={{display:"flex",gap:8}}>
            {a.statut==="en attente"&&<button onClick={()=>{setNotes(INIT_CONTROLE);setDecision("");setObsAgr("");setAgreeMode(true);}} style={{padding:"7px 16px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,background:C.greenLight,color:C.greenDark,border:`1.5px solid ${C.greenBorder}`}}>✅ Agréer ce lot</button>}
            <button onClick={()=>deleteArrivage(a.id)} style={{padding:"7px 16px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,background:C.red,color:C.redText,border:`1.5px solid ${C.redBorder}`}}>🗑 Supprimer</button>
          </div>
        )}
      </div>
      <div style={card}>
        <div style={cardTop}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <p style={{margin:"0 0 4px",fontWeight:700,fontSize:20,color:C.greenDark}}>{a.produit}{a.variete&&` · ${a.variete}`}</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <Pill>🏭 {a.fournisseur}</Pill>
                {a.lot_interne&&<Pill>🔖 Int. : {a.lot_interne}</Pill>}
                {a.lot_fournisseur&&<Pill>🔢 Fourn. : {a.lot_fournisseur}</Pill>}
                <Pill>📦 {a.quantite} {a.unite}</Pill>
                {a.poids_net&&<Pill>⚖ {a.poids_net} kg net</Pill>}
                {a.poids_colis&&<Pill>📦 {a.poids_colis} kg/colis</Pill>}
                {a.origine&&<Pill>🌍 {a.origine}</Pill>}
                
                {a.date&&<Pill>📅 {a.date}</Pill>}
              </div>
            </div>
            <Badge status={a.statut}/>
          </div>
        </div>
        <div style={cardBody}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{background:C.pillBg,borderRadius:10,padding:"10px 14px"}}>
              <p style={{margin:"0 0 2px",fontSize:11,color:C.textMuted,textTransform:"uppercase",fontWeight:600}}>Acheteur</p>
              <p style={{margin:0,fontWeight:600}}>{a.acheteur||"—"}</p>
            </div>
            <div style={{background:C.pillBg,borderRadius:10,padding:"10px 14px"}}>
              <p style={{margin:"0 0 2px",fontSize:11,color:C.textMuted,textTransform:"uppercase",fontWeight:600}}>Agréeur</p>
              <p style={{margin:0,fontWeight:600}}>{a.agréeur||"En attente"}</p>
            </div>
            {a.notes?.heure_agreage&&<div style={{background:C.pillBg,borderRadius:10,padding:"10px 14px"}}>
              <p style={{margin:"0 0 2px",fontSize:11,color:C.textMuted,textTransform:"uppercase",fontWeight:600}}>Heure agrément</p>
              <p style={{margin:0,fontWeight:600}}>{a.notes.heure_agreage}</p>
            </div>}
            {a.notes?.temperature&&<div style={{background:parseFloat(a.notes.temperature)>15?C.orange:C.blue,borderRadius:10,padding:"10px 14px"}}>
              <p style={{margin:"0 0 2px",fontSize:11,color:parseFloat(a.notes.temperature)>15?C.orangeText:C.blueText,textTransform:"uppercase",fontWeight:600}}>Température {parseFloat(a.notes.temperature)>15?"⚠️":""}</p>
              <p style={{margin:0,fontWeight:600,color:parseFloat(a.notes.temperature)>15?C.orangeText:C.blueText}}>{a.notes.temperature}°C</p>
            </div>}
          </div>
          {a.notes?.qualite>0&&<div style={{marginBottom:12}}>
            <p style={{fontSize:12,fontWeight:600,color:C.textMuted,textTransform:"uppercase",marginBottom:8}}>Évaluation qualité</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{background:NOTE_BG[a.notes.qualite],color:NOTE_COLORS[a.notes.qualite],border:`1px solid ${NOTE_COLORS[a.notes.qualite]}44`,padding:"4px 12px",borderRadius:20,fontWeight:700,fontSize:13}}>👁 {NOTE_LABELS[a.notes.qualite]}</span>
              {a.notes.poids_colis_mesure&&<span style={{background:C.pillBg,color:C.pillText,padding:"4px 12px",borderRadius:20,fontWeight:600,fontSize:13}}>⚖ {a.notes.poids_colis_mesure} kg/colis mesuré</span>}
              {a.notes.quantite_ok===true&&<span style={{background:C.greenLight,color:C.greenDark,padding:"4px 12px",borderRadius:20,fontWeight:600,fontSize:13}}>📦 Qté correcte</span>}
              {a.notes.quantite_ok===false&&<span style={{background:C.red,color:C.redText,padding:"4px 12px",borderRadius:20,fontWeight:600,fontSize:13}}>📦 Qté corrigée : {a.notes.quantite_corrigee}</span>}
              {a.notes.ggn&&<span style={{background:C.greenLight,color:C.greenDark,padding:"4px 12px",borderRadius:20,fontWeight:600,fontSize:13}}>✓ GGN</span>}
              {a.notes.num_lot&&<span style={{background:C.greenLight,color:C.greenDark,padding:"4px 12px",borderRadius:20,fontWeight:600,fontSize:13}}>✓ N° Lot</span>}
              {a.notes.origine_ok&&<span style={{background:C.greenLight,color:C.greenDark,padding:"4px 12px",borderRadius:20,fontWeight:600,fontSize:13}}>✓ Origine</span>}
            </div>
          </div>}
          {a.notes?.lot_fournisseur_litige&&<div style={{background:C.blue,border:`1px solid ${C.blueBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
            <p style={{margin:"0 0 2px",fontSize:12,fontWeight:700,color:C.blueText}}>🔢 N° Lot fournisseur (litige)</p>
            <p style={{margin:0,fontSize:13,color:C.blueText,fontWeight:600}}>{a.notes.lot_fournisseur_litige}</p>
          </div>}
          {a.notes?.refus_raison&&<div style={{background:C.red,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
            <p style={{margin:"0 0 2px",fontSize:12,fontWeight:700,color:C.redText}}>❌ Raison du refus</p>
            <p style={{margin:0,fontSize:13,color:C.redText}}>{a.notes.refus_raison} — {a.notes.refus_pct}% refusé</p>
            {a.notes.refus_photos&&<p style={{margin:"4px 0 0",fontSize:12,color:C.redText}}>📷 {a.notes.refus_photos}</p>}
          </div>}
          {a.notes?.reserve_raison&&<div style={{background:"#fff8e6",border:"1px solid #ffe08a",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
            <p style={{margin:"0 0 2px",fontSize:12,fontWeight:700,color:"#7d5a00"}}>⚠️ Réserve</p>
            <p style={{margin:0,fontSize:13,color:"#7d5a00"}}>{a.notes.reserve_raison} — {a.notes.reserve_pct}% concerné</p>
            {a.notes.reserve_photos&&<p style={{margin:"4px 0 0",fontSize:12,color:"#7d5a00"}}>📷 {a.notes.reserve_photos}</p>}
          </div>}
          {a.obsAgr&&<div style={{background:C.blue,border:`1px solid ${C.blueBorder}`,borderRadius:10,padding:"10px 14px"}}>
            <p style={{margin:"0 0 2px",fontSize:12,fontWeight:700,color:C.blueText}}>💬 Observations agréeur</p>
            <p style={{margin:0,fontSize:13,color:C.blueText,fontStyle:"italic"}}>{a.obsAgr}</p>
          </div>}
        </div>
      </div>
    </div>
  );

  // ── ARRIVAGE CARD (reusable row) ──────────────────────────────────────────────
  const ArrivageCard = ({ a, onClick, showDelete=true }) => (
    <div style={{...card, cursor:onClick?"pointer":"default", borderLeft:a.statut==="en attente"?"4px solid #e6a817":a.statut==="refusé"?`4px solid ${C.redText}`:a.statut==="sous réserve"?"4px solid #e6a817":"none"}} onClick={onClick}>
      <div style={{...cardTop,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <p style={{margin:"0 0 4px",fontWeight:700,fontSize:15,color:C.greenDark}}>{a.produit}{a.variete&&` · ${a.variete}`}</p>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <Pill>🏭 {a.fournisseur}</Pill>
            <Pill>📦 {a.quantite} {a.unite}</Pill>
            {a.lot_interne&&<Pill>🔖 {a.lot_interne}</Pill>}
            {a.lot_fournisseur&&<Pill>🔢 {a.lot_fournisseur}</Pill>}
            {a.origine&&<Pill>🌍 {a.origine}</Pill>}
            
            {a.date&&<Pill>📅 {a.date}</Pill>}
            {a.agréeur&&<Pill>✅ {a.agréeur}</Pill>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:8}}>
          <Badge status={a.statut}/>
          {showDelete&&<button onClick={e=>{e.stopPropagation();deleteArrivage(a.id);}} style={{background:"transparent",border:`1px solid ${C.redBorder}`,color:C.redText,borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:14}}>🗑</button>}
        </div>
      </div>
      {a.statut!=="en attente"&&a.agréeur&&(a.notes?.refus_raison||a.notes?.reserve_raison)&&(
        <div style={{...cardBody,paddingTop:8,paddingBottom:8}}>
          {a.notes.refus_raison&&<p style={{margin:0,fontSize:13,color:C.redText}}>❌ {a.notes.refus_raison}</p>}
          {a.notes.reserve_raison&&<p style={{margin:0,fontSize:13,color:"#7d5a00"}}>⚠️ {a.notes.reserve_raison}</p>}
        </div>
      )}
    </div>
  );

  // ── IMPORT EXCEL VIEW ────────────────────────────────────────────────────────
  const ImportView = () => !preview ? (
    <div style={card}>
      <div style={cardTop}><p style={{margin:0,fontWeight:700,fontSize:15,color:C.greenDark}}>📊 Importer le journal Geslot</p></div>
      <div style={cardBody}>
        <div style={{border:`2px dashed ${C.greenBorder}`,borderRadius:12,padding:"40px 24px",textAlign:"center",background:"#fafffe",cursor:"pointer",position:"relative"}}>
          <input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/>
          <div style={{fontSize:40,marginBottom:12}}>📂</div>
          <p style={{fontWeight:700,fontSize:15,color:C.text,margin:"0 0 4px"}}>{importing?"Lecture en cours...":"Glissez votre fichier Excel Geslot ici"}</p>
          <p style={{fontSize:12,color:C.textMuted,margin:0}}>Format .xlsx</p>
        </div>
      </div>
    </div>
  ) : (
    <div>
      <div style={card}>
        <div style={{...cardTop,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{margin:0,fontWeight:700,fontSize:15,color:C.greenDark}}>✅ {preview.length} arrivages détectés</p>
          <button onClick={()=>setPreview(null)} style={{fontSize:12,padding:"6px 12px",borderRadius:8,cursor:"pointer",background:"transparent",border:`1px solid ${C.redBorder}`,color:C.redText}}>Annuler</button>
        </div>
        <div style={{maxHeight:400,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"#f8faf9"}}>{["Lot Int.","Fournisseur","Produit","Nb colis","Poids net","Date"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",borderBottom:`2px solid ${C.greenBorder}`}}>{h}</th>)}</tr></thead>
            <tbody>{preview.map((a,i)=><tr key={i} style={{borderBottom:`1px solid ${C.greenBorder}22`}}>
              <td style={{padding:"8px 12px",color:C.textMuted,fontSize:12}}>{a.lot_interne}</td>
              <td style={{padding:"8px 12px",fontWeight:500}}>{a.fournisseur}</td>
              <td style={{padding:"8px 12px"}}>{a.produit}</td>
              <td style={{padding:"8px 12px",textAlign:"center"}}><strong>{a.quantite}</strong></td>
              <td style={{padding:"8px 12px",textAlign:"center"}}>{a.poids_net?`${a.poids_net} kg`:"—"}</td>
              <td style={{padding:"8px 12px",color:C.textMuted,fontSize:12}}>{a.date}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      <button onClick={confirmImport} disabled={importing} style={{width:"100%",padding:"14px",background:importing?"#ccc":C.green,color:"#fff",border:"none",borderRadius:14,fontWeight:700,cursor:importing?"default":"pointer",fontSize:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
        {importing?"Import en cours...":`Confirmer l'import de ${preview.length} arrivages →`}
      </button>
    </div>
  );

  // ── PHOTO MISSING POPUP ───────────────────────────────────────────────────────
  const PhotoMissingPopup = () => photoModal ? (
    <Modal title="📷 Photo manquante" onClose={keepPending}>
      <p style={{fontSize:14,color:C.text,marginBottom:20}}>
        Aucune photo n'a été ajoutée pour ce {photoModal==="reserve"?"sous réserve":"refus litige"}.<br/>
        Que voulez-vous faire ?
      </p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={keepPending} style={{flex:1,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:600,fontSize:14,background:C.amber,color:C.amberText,border:`1.5px solid ${C.amberBorder}`,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          ⏳ Garder en attente
        </button>
        <button onClick={confirmWithoutPhoto} style={{flex:1,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:600,fontSize:14,background:C.red,color:C.redText,border:`1.5px solid ${C.redBorder}`,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          Confirmer sans photo
        </button>
      </div>
    </Modal>
  ) : null;

  // ── MANAGER ───────────────────────────────────────────────────────────────────
  // ── UNIFIED RENDER ───────────────────────────────────────────────────────────
  const filteredEA = applyFilters(enAttente, filters);
  const filteredTraites = applyFilters(traites, filters);

  if (horsListeMode) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <Toast/><PhotoMissingPopup/>
      <Header extraNav={<button onClick={()=>setHorsListeMode(false)} style={{padding:"9px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,border:`2px solid ${C.greenBorder}`,background:C.white,color:C.textMuted,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>← Retour</button>}/>
      <div style={{maxWidth:720,margin:"0 auto",padding:"0 20px 40px"}}>
        <div style={{...card}}>
          <div style={{...cardTop}}><p style={{margin:0,fontWeight:700,fontSize:16,color:C.greenDark}}>⚠️ Signaler un litige hors liste</p></div>
          <div style={{...cardBody}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
              <Field label="Produit" required><input value={horsListe.produit} onChange={e=>setHorsListe({...horsListe,produit:e.target.value})} placeholder="Ex : Tomate grappe" style={inputStyle}/></Field>
              <Field label="Fournisseur" required><input value={horsListe.fournisseur} onChange={e=>setHorsListe({...horsListe,fournisseur:e.target.value})} placeholder="Ex : PICVERT" style={inputStyle}/></Field>
              <Field label="N° Lot interne"><input value={horsListe.lot_interne} onChange={e=>setHorsListe({...horsListe,lot_interne:e.target.value})} style={inputStyle}/></Field>
              <Field label="N° Lot fournisseur" required><input value={horsListe.lot_fournisseur_litige} onChange={e=>setHorsListe({...horsListe,lot_fournisseur_litige:e.target.value})} style={inputStyle}/></Field>
              <Field label="Origine"><input value={horsListe.origine} onChange={e=>setHorsListe({...horsListe,origine:e.target.value})} style={inputStyle}/></Field>
              <Field label="Quantité"><div style={{display:"flex",gap:8}}><input type="number" value={horsListe.quantite} onChange={e=>setHorsListe({...horsListe,quantite:e.target.value})} style={{...inputStyle,flex:1}}/><select value={horsListe.unite} onChange={e=>setHorsListe({...horsListe,unite:e.target.value})} style={{...inputStyle,width:90}}><option>colis</option><option>kg</option></select></div></Field>
            </div>
            <Field label="Décision">
              <div style={{display:"flex",gap:8}}>
                {["sous réserve","refusé"].map(d=><button key={d} onClick={()=>setHorsListe({...horsListe,decision:d})} style={{flex:1,padding:"10px",borderRadius:10,cursor:"pointer",border:`2px solid ${horsListe.decision===d?(d==="refusé"?C.redText:"#e6a817"):"#ddd"}`,background:horsListe.decision===d?(d==="refusé"?C.red:C.amber):C.white,color:horsListe.decision===d?(d==="refusé"?C.redText:C.amberText):C.textMuted,fontWeight:700,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>{d==="refusé"?"❌ Refus":"⚠️ Réserve"}</button>)}
              </div>
            </Field>
            <Field label="Raison"><textarea value={horsListe.raison} onChange={e=>setHorsListe({...horsListe,raison:e.target.value})} rows={3} style={{...inputStyle,resize:"vertical"}}/></Field>
            <Field label="% concerné"><input type="number" min="0" max="100" value={horsListe.pct} onChange={e=>setHorsListe({...horsListe,pct:e.target.value})} style={{...inputStyle,width:100}}/></Field>
            <Field label="📷 Photos"><input type="file" accept="image/*" multiple onChange={e=>setHorsListe({...horsListe,photos:Array.from(e.target.files).map(f=>f.name).join(', ')})} style={{fontSize:13}}/></Field>
            <button onClick={submitHorsListe} style={{width:"100%",padding:"14px",background:horsListe.decision==="refusé"?C.redText:"#e6a817",color:"#fff",border:"none",borderRadius:12,fontWeight:700,cursor:"pointer",fontSize:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
              📧 Enregistrer et envoyer →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Supplier detail view
  if (selectedFourn) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <Toast/>
      <Header extraNav={
        <button onClick={()=>setSelectedFourn(null)} style={{padding:"9px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,border:`2px solid ${C.greenBorder}`,background:C.white,color:C.textMuted,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>← Retour</button>
      }/>
      <div style={{maxWidth:800,margin:"0 auto",padding:"0 20px 8px"}}>
        <button onClick={()=>setSelectedFourn(null)} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",cursor:"pointer",color:C.textMuted,fontSize:14,padding:"8px 0",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
          ‹ Retour aux arrivages
        </button>
      </div>
      <div style={{maxWidth:800,margin:"0 auto",padding:"0 20px 40px"}}>
        {/* Header fournisseur */}
        <div style={{...card}}>
          <div style={{...cardTop,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{margin:"0 0 4px",fontWeight:700,fontSize:18,color:C.greenDark}}>🏭 {selectedFourn.fourn}</p>
              <p style={{margin:0,fontSize:13,color:C.textMuted}}>📅 {selectedFourn.date} · {selectedFourn.articles.length} article{selectedFourn.articles.length>1?"s":""}</p>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{margin:"0 0 2px",fontSize:13,color:C.textMuted}}>En attente</p>
              <p style={{margin:0,fontSize:24,fontWeight:800,color:"#e6a817"}}>{selectedFourn.articles.filter(a=>a.statut==="en attente").length}</p>
            </div>
          </div>
        </div>

        {/* Liste des articles */}
        <div style={card}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead>
              <tr style={{background:"#f8faf9"}}>
                {["Lot","Produit","Colis","Statut","Action"].map(h=>(
                  <th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:12,fontWeight:700,color:C.textMuted,textTransform:"uppercase",borderBottom:`2px solid ${C.greenBorder}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedFourn.articles.map((a,i)=>(
                <tr key={a.id} style={{borderBottom:`1px solid ${C.greenBorder}22`,background:i%2===0?"#fafffe":"#fff"}}>
                  <td style={{padding:"12px 14px",fontSize:12,color:C.textMuted,fontWeight:600}}>{a.lot_interne||"—"}</td>
                  <td style={{padding:"12px 14px",fontWeight:600,color:C.text}}>{a.produit}{a.variete?` · ${a.variete}`:""}</td>
                  <td style={{padding:"12px 14px",textAlign:"center",fontWeight:700}}>{a.quantite} <span style={{fontSize:11,color:C.textMuted}}>{a.unite}</span></td>
                  <td style={{padding:"12px 14px"}}>
                    <Badge status={a.statut}/>
                  </td>
                  <td style={{padding:"12px 14px"}}>
                    {a.statut==="en attente" && (
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={async()=>{
                          await update(ref(db,`arrivages/${a.id}`),{statut:"validé",agréeur:"Moorea",agreedAt:Date.now()});
                          setSelectedFourn(prev=>({...prev,articles:prev.articles.map(x=>x.id===a.id?{...x,statut:"validé"}:x)}));
                          showToast("✅ Validé");
                        }} style={{padding:"6px 12px",background:C.green,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
                          ✅ Conforme
                        </button>
                        <button onClick={()=>{
                          const params = new URLSearchParams({
                            produit: a.produit||'',
                            fournisseur: a.fournisseur||'',
                            lot: a.lot_interne||'',
                            quantite: a.quantite||'',
                            unite: a.unite||'',
                            origine: a.origine||'',
                          });
                          window.open(`https://moorea-qualite.vercel.app/?${params.toString()}`, '_blank');
                          update(ref(db,`arrivages/${a.id}`),{statut:"sous réserve",agréeur:"Moorea",agreedAt:Date.now()});
                          setSelectedFourn(prev=>({...prev,articles:prev.articles.map(x=>x.id===a.id?{...x,statut:"sous réserve"}:x)}));
                        }} style={{padding:"6px 12px",background:"#fff3e0",color:"#e65100",border:"1.5px solid #ffcc80",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
                          ⚠️ Litige
                        </button>
                      </div>
                    )}
                    {a.statut!=="en attente" && (
                      <span style={{fontSize:12,color:C.textMuted}}>{a.agréeur||"—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bouton tout valider */}
        {selectedFourn.articles.some(a=>a.statut==="en attente") && (
          <button onClick={async()=>{
            for (const a of selectedFourn.articles.filter(x=>x.statut==="en attente")) {
              await update(ref(db,`arrivages/${a.id}`),{statut:"validé",agréeur:"Moorea",agreedAt:Date.now()});
            }
            setSelectedFourn(prev=>({...prev,articles:prev.articles.map(x=>({...x,statut:x.statut==="en attente"?"validé":x.statut}))}));
            showToast("✅ Tout validé !");
          }} style={{width:"100%",padding:"16px",background:C.green,color:"#fff",border:"none",borderRadius:14,fontWeight:700,cursor:"pointer",fontSize:16,fontFamily:"'Segoe UI',system-ui,sans-serif",boxShadow:"0 4px 12px rgba(39,174,96,0.3)"}}>
            ✅ Valider tous les articles conformes
          </button>
        )}
      </div>
    </div>
  );

  if (selected) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <Toast/><PhotoMissingPopup/>
      <Header extraNav={<button onClick={()=>{setSelected(null);setNotes(INIT_CONTROLE);setDecision("");setObsAgr("");}} style={{padding:"9px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,border:`2px solid ${C.greenBorder}`,background:C.white,color:C.textMuted,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>← Retour</button>}/>
      <AgrémentForm arrivage={selected} onBack={()=>{setSelected(null);setNotes(INIT_CONTROLE);setDecision("");setObsAgr("");}} onSubmit={async(id)=>{await attemptValidation(id);}}/>
    </div>
  );

  // ── DASHBOARD PAR DATE / FOURNISSEUR ─────────────────────────────────────────
  const allArrivages = [...enAttente, ...traites];
  
  // Grouper par date puis par fournisseur
  const byDate = {};
  allArrivages.forEach(a => {
    const d = a.date || "Sans date";
    if (!byDate[d]) byDate[d] = {};
    const f = a.fournisseur || "Inconnu";
    if (!byDate[d][f]) byDate[d][f] = [];
    byDate[d][f].push(a);
  });
  
  // Trier les dates (plus récentes en premier)
  const sortedDates = Object.keys(byDate).sort((a, b) => {
    const pa = a.split('/').reverse().join('');
    const pb = b.split('/').reverse().join('');
    return pb.localeCompare(pa);
  });

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <Toast/><Header/>
      <div style={{maxWidth:800,margin:"0 auto",padding:"0 20px 40px"}}>

        {/* Stats + bouton import */}
        <div style={{display:"flex",gap:12,marginBottom:16,alignItems:"stretch"}}>
          <StatCard label="À agréer" value={enAttente.length} color="#e6a817"/>
          <StatCard label="Validés" value={traites.filter(a=>a.statut==="validé").length} color={C.greenDark}/>
          <StatCard label="Refusés" value={traites.filter(a=>a.statut==="refusé").length} color={C.redText}/>
        </div>

        {/* Boutons d'import */}
        <div style={{display:"flex",gap:10,marginBottom:20}}>
          <label style={{flex:1,padding:"16px",background:C.green,color:"#fff",borderRadius:14,cursor:"pointer",fontWeight:700,fontSize:15,textAlign:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 12px rgba(39,174,96,0.3)"}}>
            📄 Importer un PDF
            <input type="file" accept=".pdf" onChange={(e)=>{handlePDFImport(e); setPage("import");}} style={{display:"none"}}/>
          </label>
          <label style={{flex:1,padding:"16px",background:C.white,color:C.greenDark,borderRadius:14,cursor:"pointer",fontWeight:700,fontSize:15,textAlign:"center",border:`2px solid ${C.greenBorder}`,fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            📊 Importer un Excel
            <input type="file" accept=".xlsx,.xls" onChange={(e)=>{handleExcelImport(e); setPage("import");}} style={{display:"none"}}/>
          </label>
        </div>

        {/* Preview import */}
        {page==="import" && preview && (
          <div style={{...card,marginBottom:20}}>
            <div style={{...cardTop,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{margin:0,fontWeight:700,fontSize:15,color:C.greenDark}}>✅ {preview.length} arrivages détectés</p>
              <button onClick={()=>{setPreview(null);setPage("dashboard");}} style={{fontSize:12,padding:"6px 12px",borderRadius:8,cursor:"pointer",background:"transparent",border:`1px solid ${C.redBorder}`,color:C.redText}}>Annuler</button>
            </div>
            <div style={{maxHeight:300,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#f8faf9"}}>{["Lot","Fournisseur","Produit","Colis","Date"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",borderBottom:`2px solid ${C.greenBorder}`}}>{h}</th>)}</tr></thead>
                <tbody>{preview.map((a,i)=><tr key={i} style={{borderBottom:`1px solid ${C.greenBorder}22`}}>
                  <td style={{padding:"7px 12px",color:C.textMuted,fontSize:12}}>{a.lot_interne}</td>
                  <td style={{padding:"7px 12px",fontWeight:500}}>{a.fournisseur}</td>
                  <td style={{padding:"7px 12px"}}>{a.produit}</td>
                  <td style={{padding:"7px 12px",textAlign:"center"}}><strong>{a.quantite}</strong></td>
                  <td style={{padding:"7px 12px",color:C.textMuted,fontSize:12}}>{a.date}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <div style={{padding:"12px 20px"}}>
              <button onClick={confirmImport} disabled={importing} style={{width:"100%",padding:"14px",background:importing?"#ccc":C.green,color:"#fff",border:"none",borderRadius:14,fontWeight:700,cursor:importing?"default":"pointer",fontSize:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
                {importing?"Import en cours...":`Confirmer l'import de ${preview.length} arrivages →`}
              </button>
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div style={{marginBottom:16,position:"relative"}}>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Rechercher un produit, fournisseur, lot..."
            style={{width:"100%",padding:"12px 16px 12px 16px",borderRadius:12,border:`1.5px solid ${C.greenBorder}`,fontSize:14,color:C.text,background:C.white,outline:"none",boxSizing:"border-box"}}
          />
          {search && <button onClick={()=>setSearch("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textMuted}}>✕</button>}
        </div>

        {/* Dashboard principal — par date / fournisseur */}
        {true && <>
          {sortedDates.length === 0 ? (
            <div style={{textAlign:"center",padding:"3rem",background:C.greenLight,border:`1px solid ${C.greenBorder}`,borderRadius:20}}>
              <div style={{fontSize:48,marginBottom:12}}>📦</div>
              <p style={{fontWeight:700,fontSize:16,color:C.greenDark,margin:"0 0 8px"}}>Aucun arrivage</p>
              <p style={{fontSize:14,color:C.textMuted}}>Importez un PDF ou Excel pour commencer</p>
            </div>
          ) : sortedDates.map(date => {
            // Filter by search
            const filteredFourns = Object.entries(byDate[date]).filter(([fourn, articles]) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return fourn.toLowerCase().includes(q) ||
                articles.some(a => 
                  a.produit?.toLowerCase().includes(q) ||
                  a.lot_interne?.toLowerCase().includes(q) ||
                  a.origine?.toLowerCase().includes(q)
                );
            });
            if (filteredFourns.length === 0) return null;
            return (
            <div key={date} style={{marginBottom:28}}>
              {/* Header date */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{height:1,flex:1,background:C.greenBorder}}/>
                <span style={{fontSize:13,fontWeight:700,color:C.greenDark,background:C.greenLight,padding:"4px 14px",borderRadius:20,border:`1px solid ${C.greenBorder}`}}>
                  📅 {date}
                </span>
                <div style={{height:1,flex:1,background:C.greenBorder}}/>
              </div>

              {/* Liste fournisseurs accordion */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filteredFourns.map(([fourn, articles]) => {
                  const nbAttente = articles.filter(a=>a.statut==="en attente").length;
                  const nbValide = articles.filter(a=>a.statut==="validé").length;
                  const nbRefuse = articles.filter(a=>a.statut==="refusé"||a.statut==="sous réserve").length;
                  const allDone = nbAttente === 0;
                  const isOpen = selectedFourn?.fourn === fourn && selectedFourn?.date === date;
                  
                  return (
                    <div key={fourn} style={{background:C.white,borderRadius:14,border:`2px solid ${allDone?C.greenBorder:nbRefuse>0?C.redBorder:"#e6a817"}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                      
                      {/* Header row */}
                      <div onClick={()=>setSelectedFourn(isOpen ? null : {date, fourn, articles})}
                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",cursor:"pointer",background:allDone?C.greenLight:"#fff"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,flex:1}}>
                          <span style={{fontSize:20}}>{allDone?"✅":nbRefuse>0?"⚠️":"⏳"}</span>
                          <div>
                            <p style={{margin:"0 0 2px",fontWeight:700,fontSize:15,color:C.text}}>{fourn}</p>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              <span style={{fontSize:12,color:C.textMuted}}>{articles.length} article{articles.length>1?"s":""}</span>
                              {nbAttente>0&&<span style={{fontSize:11,background:"#fff8e6",color:"#7d5a00",padding:"1px 8px",borderRadius:8,fontWeight:600}}>⏳ {nbAttente} en attente</span>}
                              {nbValide>0&&<span style={{fontSize:11,background:C.greenLight,color:C.greenDark,padding:"1px 8px",borderRadius:8,fontWeight:600}}>✅ {nbValide}</span>}
                              {nbRefuse>0&&<span style={{fontSize:11,background:C.red,color:C.redText,padding:"1px 8px",borderRadius:8,fontWeight:600}}>⚠️ {nbRefuse}</span>}
                            </div>
                          </div>
                        </div>
                        <span style={{fontSize:18,color:C.textMuted,transform:isOpen?"rotate(45deg)":"rotate(0deg)",transition:"transform 0.2s",fontWeight:300}}>+</span>
                      </div>

                      {/* Articles list */}
                      {isOpen && (
                        <div style={{borderTop:`1px solid ${C.greenBorder}`}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                            <thead>
                              <tr style={{background:"#f8faf9"}}>
                                {["Lot","Produit","Colis","Action"].map(h=>(
                                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",borderBottom:`1px solid ${C.greenBorder}`}}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {articles.map((a,i)=>(
                                <tr key={a.id} style={{borderBottom:`1px solid ${C.greenBorder}22`,background:i%2===0?"#fafffe":"#fff"}}>
                                  <td style={{padding:"10px 14px",fontSize:11,color:C.textMuted,fontWeight:600}}>{a.lot_interne||"—"}</td>
                                  <td style={{padding:"10px 14px",fontWeight:600,color:C.text}}>{a.produit}</td>
                                  <td style={{padding:"10px 14px",textAlign:"center",fontWeight:700}}>{a.quantite} <span style={{fontSize:11,color:C.textMuted}}>{a.unite}</span></td>
                                  <td style={{padding:"10px 14px"}}>
                                    {a.statut==="en attente" ? (
                                      <div style={{display:"flex",gap:6}}>
                                        <button onClick={async(e)=>{
                                          e.stopPropagation();
                                          await update(ref(db,`arrivages/${a.id}`),{statut:"validé",agréeur:"Moorea",agreedAt:Date.now()});
                                          setSelectedFourn(prev=>({...prev,articles:prev.articles.map(x=>x.id===a.id?{...x,statut:"validé"}:x)}));
                                          showToast("✅ Validé");
                                        }} style={{padding:"5px 10px",background:C.green,color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12}}>
                                          ✅
                                        </button>
                                        <button onClick={(e)=>{
                                          e.stopPropagation();
                                          const params = new URLSearchParams({produit:a.produit||'',fournisseur:a.fournisseur||'',lot:a.lot_interne||'',quantite:a.quantite||'',unite:a.unite||'',origine:a.origine||''});
                                          window.open(`https://moorea-qualite.vercel.app/?${params.toString()}`,'_blank');
                                          update(ref(db,`arrivages/${a.id}`),{statut:"sous réserve",agréeur:"Moorea",agreedAt:Date.now()});
                                          setSelectedFourn(prev=>({...prev,articles:prev.articles.map(x=>x.id===a.id?{...x,statut:"sous réserve"}:x)}));
                                        }} style={{padding:"5px 10px",background:"#fff3e0",color:"#e65100",border:"1px solid #ffcc80",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12}}>
                                          ⚠️
                                        </button>
                                      </div>
                                    ) : (
                                      <Badge status={a.statut}/>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {articles.some(a=>a.statut==="en attente") && (
                            <div style={{padding:"12px 14px",borderTop:`1px solid ${C.greenBorder}`}}>
                              <button onClick={async(e)=>{
                                e.stopPropagation();
                                for (const a of articles.filter(x=>x.statut==="en attente")) {
                                  await update(ref(db,`arrivages/${a.id}`),{statut:"validé",agréeur:"Moorea",agreedAt:Date.now()});
                                }
                                setSelectedFourn(prev=>({...prev,articles:prev.articles.map(x=>({...x,statut:x.statut==="en attente"?"validé":x.statut}))}));
                                showToast("✅ Tout validé !");
                              }} style={{width:"100%",padding:"10px",background:C.green,color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
                                ✅ Tout valider
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </>}

      </div>
    </div>
  );
}
