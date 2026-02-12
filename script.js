import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, getDocs, deleteDoc, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZxSJBPrOkDWRAqPG0tJM4AdwT5kgzjnk",
    authDomain: "registro-ingreso-5d3a1.firebaseapp.com",
    projectId: "registro-ingreso-5d3a1",
    storageBucket: "registro-ingreso-5d3a1.firebasestorage.app",
    messagingSenderId: "737060993636",
    appId: "1:737060993636:web:3a1d2783bcbdd534a6bd71"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

let maestros = [];
let listaGuardias = [];

// --- MANEJO DE SESIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        // Forzamos visibilidad de botones para que no te bloquees
        document.getElementById('admin-panel').style.display = 'flex';
        cargarDatos();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

// --- CARGA DE DATOS ---
function cargarDatos() {
    // 1. Cargar Conductores (Maestro)
    onSnapshot(collection(db, "conductores"), (snap) => {
        maestros = snap.docs.map(d => d.data());
    });

    // 2. Cargar Guardias (COLECCIÓN: lista_guardias)
    onSnapshot(collection(db, "lista_guardias"), (snap) => {
        listaGuardias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        actualizarSelects();
        renderizarGuardiasAdmin();
    });
}

function actualizarSelects() {
    const selects = ['t-guardia-id', 'v-guardia-id'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            sel.innerHTML = '<option value="">-- Seleccione Guardia --</option>';
            listaGuardias.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.nombre;
                opt.textContent = g.nombre;
                sel.appendChild(opt);
            });
        }
    });
}

// --- FORMATEO Y AUTOCOMPLETADO ---
function formatearRUT(rut) {
    let v = rut.replace(/[^\dkK]/g, "");
    if (v.length > 1) v = v.slice(0, -1) + "-" + v.slice(-1);
    return v.toUpperCase();
}

document.getElementById('t-rut').oninput = (e) => {
    const val = e.target.value = formatearRUT(e.target.value);
    const box = document.getElementById('t-sugerencias');
    box.innerHTML = "";
    if (val.length < 3) return;
    maestros.filter(m => m.rut.startsWith(val)).forEach(m => {
        const d = document.createElement('div');
        d.className = 'sugerencia-item';
        d.textContent = `${m.rut} | ${m.nombre}`;
        d.onclick = () => {
            document.getElementById('t-rut').value = m.rut;
            document.getElementById('t-nombre').value = m.nombre;
            document.getElementById('t-empresa').value = m.empresa;
            box.innerHTML = "";
        };
        box.appendChild(d);
    });
};

// --- GUARDAR REGISTROS (CON VALIDACIÓN OBLIGATORIA) ---
document.getElementById('form-transporte').onsubmit = async (e) => {
    e.preventDefault();
    const rut = document.getElementById('t-rut').value;
    const nombre = document.getElementById('t-nombre').value.trim();
    const empresa = document.getElementById('t-empresa').value.trim();
    const guardia = document.getElementById('t-guardia-id').value;

    if(!guardia || !nombre || !empresa) {
        alert("❌ Error: Seleccione guardia y complete Nombre/Empresa.");
        return;
    }

    const ahora = new Date();
    await addDoc(collection(db, "ingresos"), {
        tipo: "TRANSPORTE",
        guardia, rut, nombre, empresa,
        patente: document.getElementById('t-patente').value,
        fecha: ahora.toLocaleDateString('es-CL'),
        hora: ahora.toLocaleTimeString('es-CL'),
        fechaFiltro: ahora.toISOString().split('T')[0]
    });
    alert("✅ Ingreso registrado");
    e.target.reset();
};

// --- MAESTRO (EVITAR DUPLICADOS) ---
document.getElementById('form-maestro').onsubmit = async (e) => {
    e.preventDefault();
    const rut = document.getElementById('m-rut').value.trim();
    const nombre = document.getElementById('m-nombre').value.trim();
    const empresa = document.getElementById('m-empresa').value.trim();

    const q = query(collection(db, "conductores"), where("rut", "==", rut));
    const snap = await getDocs(q);
    if (!snap.empty) return alert("⚠️ Este RUT ya existe en el maestro.");

    await addDoc(collection(db, "conductores"), { rut, nombre, empresa });
    alert("✅ Guardado en Maestro");
    document.getElementById('modal-conductor').style.display = 'none';
    e.target.reset();
};

// --- EXCEL ---
document.getElementById('btn-exportar').onclick = async () => {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;
    if(!inicio || !fin) return alert("Seleccione rango de fechas");

    const snap = await getDocs(collection(db, "ingresos"));
    const datos = snap.docs.map(d => d.data()).filter(r => r.fechaFiltro >= inicio && r.fechaFiltro <= fin);
    
    if(datos.length === 0) return alert("No hay datos para estas fechas");

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, "Reporte_Prosud.xlsx");
};

// --- GESTIÓN GUARDIAS ---
function renderizarGuardiasAdmin() {
    const listaDiv = document.getElementById('lista-guardias-admin');
    if (!listaDiv) return;
    listaDiv.innerHTML = "";
    listaGuardias.forEach(g => {
        const item = document.createElement('div');
        item.style = "display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;";
        item.innerHTML = `<span>${g.nombre}</span> <button onclick="window.eliminarG('${g.id}')" style="color:red; cursor:pointer; border:none; background:none;">✖</button>`;
        listaDiv.appendChild(item);
    });
}
window.eliminarG = async (id) => { if(confirm("¿Eliminar guardia?")) await deleteDoc(doc(db, "lista_guardias", id)); };

document.getElementById('btn-add-guardia').onclick = async () => {
    const nom = document.getElementById('nuevo-guardia-nombre').value;
    if(nom) await addDoc(collection(db, "lista_guardias"), { nombre: nom });
    document.getElementById('nuevo-guardia-nombre').value = "";
};

// --- NAVEGACIÓN (ABRIR/CERRAR) ---
document.getElementById('btn-tab-transporte').onclick = () => {
    document.getElementById('sec-transporte').style.display='block';
    document.getElementById('sec-visitas').style.display='none';
    document.getElementById('btn-tab-transporte').classList.add('active');
    document.getElementById('btn-tab-visitas').classList.remove('active');
};
document.getElementById('btn-tab-visitas').onclick = () => {
    document.getElementById('sec-visitas').style.display='block';
    document.getElementById('sec-transporte').style.display='none';
    document.getElementById('btn-tab-visitas').classList.add('active');
    document.getElementById('btn-tab-transporte').classList.remove('active');
};

document.getElementById('btn-abrir-modal').onclick = () => document.getElementById('modal-conductor').style.display='flex';
document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-conductor').style.display='none';
document.getElementById('btn-abrir-reportes').onclick = () => document.getElementById('modal-reportes').style.display='flex';
document.getElementById('btn-cerrar-reportes').onclick = () => document.getElementById('modal-reportes').style.display='none';
document.getElementById('btn-gestionar-guardias').onclick = () => document.getElementById('modal-gestion-guardias').style.display='flex';
document.getElementById('btn-cerrar-gestion').onclick = () => document.getElementById('modal-gestion-guardias').style.display='none';

document.getElementById('btn-login').onclick = () => {
    const m = document.getElementById('login-email').value;
    const p = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, m, p).catch(() => alert("Error de acceso"));
};
document.getElementById('btn-logout').onclick = () => signOut(auth);
document.getElementById('m-rut').oninput = (e) => e.target.value = formatearRUT(e.target.value);
