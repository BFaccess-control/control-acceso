import { db } from './jslg.js';
import { collection, addDoc, onSnapshot, getDocs, deleteDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    if (v.length > 4) v = v.slice(0, -1) + "-" + v.slice(-1); 
    return v.substring(0, 7);
};

// --- SUSCRIPCIONES A MAESTROS ---
onSnapshot(collection(db, "conductores"), (snap) => { maestros = snap.docs.map(d => d.data()); });
onSnapshot(collection(db, "vehiculos"), (snap) => { maestroPatentes = snap.docs.map(d => d.data()); });

// --- AUTOCOMPLETADOS ---
export function activarAutocompletadoRUT(idInput, idBox) {
    const input = document.getElementById(idInput);
    if (!input) return;
    
    input.oninput = (e) => {
        const val = e.target.value = formatearRUT(e.target.value);
        const bLimpia = val.replace(/-/g, "");
        const box = document.getElementById(idBox);
        box.innerHTML = "";

        gestionarBloqueoCampos(idInput, false);

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
                gestionarBloqueoCampos(idInput, true);
            };
            box.appendChild(d);
        });
    };
}

function gestionarBloqueo
