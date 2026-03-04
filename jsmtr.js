import { db } from './jslg.js';
import { collection, addDoc, onSnapshot, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let maestros = [];
let listaGuardias = [];
let maestroPatentes = [];

// --- FORMATEADORES ---
export const formatearRUT = (rut) => {
    let v = rut.replace(/[^\dkK]/g, "");
    if (v.length > 1) v = v.slice(0, -1) + "-" + v.slice(-1);
    return v.toUpperCase();
};

export const formatearPatente = (val) => {
    let v = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return v.substring(0, 7);
};

// --- MAESTROS ---
onSnapshot(collection(db, "conductores"), (s) => { maestros = s.docs.map(d => d.data()); });
onSnapshot(collection(db, "vehiculos"), (s) => { maestroPatentes = s.docs.map(d => d.data()); });

// --- AUTOCOMPLETADOS ---
export function activarAutocompletadoRUT(idInput, idBox) {
    const input = document.getElementById(idInput);
    if (!input) return;
    input.oninput = (e) => {
        const val = e.target.value = formatearRUT(e.target.value);
        const box = document.getElementById(idBox);
        box.innerHTML = "";
        const bLimpia = val.replace(/-/g, "");
        if (bLimpia.length < 3) return;
        const sugerencias = maestros.filter(m => m.rut.replace(/-/g, "").startsWith(bLimpia));
        sugerencias.forEach(p => {
            const d = document.createElement('div');
            d.className="sugerencia-item";
            d.textContent=`${p.rut} | ${p.nombre}`;
            d.onclick = () => {
                input.value = p.rut;
                if(idInput === 't-rut') {
                    document.getElementById('t-nombre').value = p.nombre;
                    document.getElementById('t-empresa').value = p.empresa;
                } else if(idInput === 'v-rut') {
                    document.getElementById('v-nombre').value = p.nombre;
                    document.getElementById('v-representa').value = p.empresa || "";
                } else if(idInput === 'a-rut') {
                    document.getElementById('a-nombre').value = p.nombre;
                }
                box.innerHTML = "";
            };
            box.appendChild(d);
        });
    };
}

export function activarAutocompletadoPatente(idInput, idBox) {
    const input = document.getElementById(idInput);
    if (!input) return;
    input.oninput = (e) => {
        const val = e.target.value = formatearPatente(e.target.value);
        const box = document.getElementById(idBox);
        box.innerHTML = "";
        if (val.length < 2) return;
        maestroPatentes.filter(p => p.patente.startsWith(val)).forEach(item => {
            const d = document.createElement('div');
            d.className="sugerencia-item";
            d.textContent=item.patente;
            d.onclick = () => { input.value = item.patente; box.innerHTML=""; };
            box.appendChild(d);
        });
    };
}

// --- GESTIÓN DE GUARDIAS ---
export const cargarGuardiasYListados = async () => {
    const colRef = collection(db, "lista_guardias");
    const renderizar = (docs) => {
        listaGuardias = docs.map(d => ({id: d.id, ...d.data()}));
        let opciones = '<option value="">-- Seleccione Guardia --</option>';
        listaGuardias.forEach(g => { opciones += `<option value="${g.nombre}">${g.nombre}</option>`; });
        ['t-guardia-id', 'v-guardia-id', 'a-guardia-id'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = opciones;
        });
    };
    const snap = await getDocs(colRef);
    renderizar(snap.docs);
    onSnapshot(colRef, (s) => renderizar(s.docs));
};

// --- REGISTRO ---
export const guardarRegistro = async (data) => {
    const n = new Date();
    data.fecha = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    data.hora = n.toLocaleTimeString('es-CL', { hour12: false });
    try {
        await addDoc(collection(db, "ingresos"), data);
        alert("✅ Guardado");
    } catch (e) { alert("Error: " + e.message); }
};

// --- EXCEL ---
export const exportarExcel = async (inicio, fin, tipoF) => {
    try {
        const snap = await getDocs(collection(db, "ingresos"));
        const filtrados = snap.docs.map(d => d.data()).filter(r => {
            if (!r.fecha) return false;
            let f = r.fecha;
            if (f.includes("-") && f.split("-")[0].length === 2) {
                const [d, m, a] = f.split("-");
                f = `${a}-${m}-${d}`;
            }
            return (f >= inicio && f <= fin) && (tipoF === "TODOS" || r.tipo === tipoF);
        });
        if(filtrados.length === 0) return alert("Sin datos");
        const ws = XLSX.utils.json_to_sheet(filtrados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `Reporte.xlsx`);
    } catch (e) { alert("Error Excel: " + e.message); }
};
