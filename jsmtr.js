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

// --- SUSCRIPCIONES A MAESTROS ---
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

// --- GUARDADO UNIFICADO A DD-MM-YYYY ---
export const guardarRegistro = async (data) => {
    const n = new Date();
    const dia = String(n.getDate()).padStart(2, '0');
    const mes = String(n.getMonth() + 1).padStart(2, '0');
    data.fecha = `${dia}-${mes}-${n.getFullYear()}`;
    data.hora = n.toLocaleTimeString('es-CL', { hour12: false });
    
    try {
        await addDoc(collection(db, "ingresos"), data);
        alert("✅ Registro guardado (Formato Chile)");
    } catch (e) { alert("Error: " + e.message); }
};

// --- FUNCIÓN PARA EL MAESTRO DE PATENTES ---
export const aprenderPatente = async (pat) => {
    if (pat && pat.length >= 6 && !maestroPatentes.some(p => p.patente === pat)) {
        await addDoc(collection(db, "vehiculos"), { patente: pat });
    }
};

// --- EXCEL (TRADUCTOR DE FORMATOS) ---
export const exportarExcel = async (inicio, fin
