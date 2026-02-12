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
        await configurarPermisos(user.email);
        cargarDatos();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

async function configurarPermisos(email) {
    const adminPanel = document.getElementById('admin-panel');
    const btnGestionar = document.getElementById('btn-gestionar-guardias');
    try {
        const docRef = doc(db, "admins", email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            adminPanel.style.display = 'flex';
            const data = docSnap.data();
            btnGestionar.style.display = (data.rol === 'administrador') ? 'block' : 'none';
        }
    } catch (e) { console.error("Error en permisos", e); }
}

// --- CARGA DE DATOS ---
function cargarDatos() {
    onSnapshot(collection(db, "conductores"), (snap) => {
        maestros = snap.docs.map(d => d.data());
    });

    onSnapshot(collection(db, "lista_guardias"), (snap) => {
        listaGuardias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        actualizarSelects();
        renderizarGuardiasAdmin();
    });
}

function actualizarSelects() {
    ['t-guardia-id', 'v-guardia-id'].forEach(id => {
        const sel = document.getElementById(id);
        sel.innerHTML = '<option value="">-- Seleccione Guardia --</option>';
        listaGuardias.forEach(g => {
            sel.innerHTML += `<option value="${g.nombre}">${g.nombre}</option>`;
        });
    });
}

// --- FORMATEO RUT ---
function formatearRUT(rut) {
    let v = rut.replace(/[^\dkK]/g, "");
    if (v.length > 1) v = v.slice(0, -1) + "-" + v.slice(-1);
    return v.toUpperCase();
}

// --- AUTOCOMPLETADO ---
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

// --- GUARDAR REGISTROS ---
document.getElementById('form-transporte').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('t-nombre').value.trim();
    const empresa = document.getElementById('t-empresa').value.trim();
    if(!nombre || !empresa) return alert("Nombre y Empresa son obligatorios");

    const ahora = new Date();
    await addDoc(collection(db, "ingresos"), {
        tipo: "TRANSPORTE",
        guardia: document.getElementById('t-guardia-id').value,
        rut: document.getElementById('t-rut').value,
        nombre, empresa,
        patente: document.getElementById('t-patente').value,
        fecha: ahora.toLocaleDateString('es-CL'),
        hora: ahora.toLocaleTimeString('es-CL'),
        fechaFiltro: ahora.toISOString().split('T')[0]
    });
    alert("✅ Registro exitoso");
    e.target.reset();
};

// --- MAESTRO SIN DUPLICADOS ---
document.getElementById('form-maestro').onsubmit = async (e) => {
    e.preventDefault();
    const rut = document.getElementById('m-rut').value.trim();
    const q = query(collection(db, "conductores"), where("rut", "==", rut));
    const snap = await getDocs(q);
    if (!snap.empty) return alert("⚠️ Ya existe este RUT en el maestro");

    await addDoc(collection(db, "conductores"), {
        rut,
        nombre: document.getElementById('m-nombre').value.trim(),
        empresa: document.getElementById('m-empresa').value.trim()
    });
    alert("✅ Guardado");
    document.getElementById('modal-conductor').style.display = 'none';
    e.target.reset();
};

// --- EXPORTAR EXCEL ---
document.getElementById('btn-exportar').onclick = async () => {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;
    if(!inicio || !fin) return alert("Seleccione fechas");

    const snap = await getDocs(collection(db, "ingresos"));
    const datos = snap.docs.map(d => d.data()).filter(r => r.fechaFiltro >= inicio && r.fechaFiltro <= fin);
    
    if(datos.length === 0) return alert("No hay datos en ese rango");

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ingresos");
    XLSX.writeFile(wb, "Reporte_Prosud.xlsx");
};

// --- GESTIÓN GUARDIAS ---
function renderizarGuardiasAdmin() {
    const div = document.getElementById('lista-guardias-admin');
    div.innerHTML = "";
    listaGuardias.forEach(g => {
        const item = document.createElement('div');
        item.innerHTML = `${g.nombre} <button onclick="window.eliminarG('${g.id}')" style="color:red; float:right;">✖</button>`;
        div.appendChild(item);
    });
}
window.eliminarG = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, "lista_guardias", id)); };

document.getElementById('btn-add-guardia').onclick = async () => {
    const n = document.getElementById('nuevo-guardia-nombre');
    if(n.value) await addDoc(collection(db, "lista_guardias"), { nombre: n.value });
    n.value = "";
};

// --- BOTONES Y MODALES ---
document.getElementById('btn-tab-transporte').onclick = () => {
    document.getElementById('sec-transporte').style.display='block';
    document.getElementById('sec-visitas').style.display='none';
};
document.getElementById('btn-tab-visitas').onclick = () => {
    document.getElementById('sec-visitas').style.display='block';
    document.getElementById('sec-transporte').style.display='none';
};
document.getElementById('btn-abrir-modal').onclick = () => document.getElementById('modal-conductor').style.display='flex';
document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-conductor').style.display='none';
document.getElementById('btn-abrir-reportes').onclick = () => document.getElementById('modal-reportes').style.display='flex';
document.getElementById('btn-cerrar-reportes').onclick = () => document.getElementById('modal-reportes').style.display='none';
document.getElementById('btn-gestionar-guardias').onclick = () => document.getElementById('modal-gestion-guardias').style.display='flex';
document.getElementById('btn-cerrar-gestion').onclick = () => document.getElementById('modal-gestion-guardias').style.display='none';
document.getElementById('btn-login').onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).catch(()=>alert("Error"));
};
document.getElementById('btn-logout').onclick = () => signOut(auth);
