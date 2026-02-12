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
let maestroPatentes = [];

// --- AUTENTICACIÓN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        configurarPermisosSeguros(user.email);
        cargarDatosIniciales();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

async function configurarPermisosSeguros(email) {
    try {
        const docRef = doc(db, "admins", email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            document.getElementById('btn-gestionar-guardias').style.display = 'block';
            document.getElementById('btn-abrir-reportes').style.display = 'block';
        } else {
            document.getElementById('btn-gestionar-guardias').style.display = 'none';
            document.getElementById('btn-abrir-reportes').style.display = 'none';
        }
    } catch (e) { console.error("Error verificando permisos:", e); }
}

document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); }
    catch (e) { alert("Acceso denegado"); }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- CARGA DE DATOS ---
function cargarDatosIniciales() {
    onSnapshot(collection(db, "conductores"), (snap) => {
        maestros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });

    onSnapshot(collection(db, "guardias"), (snap) => {
        listaGuardias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        actualizarSelectsGuardias();
        renderizarListaGestionGuardias();
    });

    onSnapshot(collection(db, "patentes"), (snap) => {
        maestroPatentes = snap.docs.map(d => d.data().patente);
    });
}

function actualizarSelectsGuardias() {
    const selects = ['t-guardia-id', 'v-guardia-id'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        sel.innerHTML = '<option value="">Seleccione Guardia</option>';
        listaGuardias.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.nombre;
            opt.textContent = g.nombre;
            sel.appendChild(opt);
        });
    });
}

// --- LÓGICA DE TRANSPORTE (CON CAMPOS OBLIGATORIOS) ---
const tRut = document.getElementById('t-rut');
const tNombre = document.getElementById('t-nombre');
const tEmpresa = document.getElementById('t-empresa');
const tSugerencias = document.getElementById('t-sugerencias');

tRut.oninput = (e) => {
    const val = e.target.value = formatearRUT(e.target.value);
    tSugerencias.innerHTML = '';
    if (val.length > 3) {
        const filtrados = maestros.filter(m => m.rut.includes(val));
        filtrados.forEach(m => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            div.textContent = `${m.rut} - ${m.nombre}`;
            div.onclick = () => {
                tRut.value = m.rut;
                tNombre.value = m.nombre;
                tEmpresa.value = m.empresa;
                tSugerencias.innerHTML = '';
            };
            tSugerencias.appendChild(div);
        });
    }
};

document.getElementById('form-transporte').onsubmit = async (e) => {
    e.preventDefault();
    const rut = tRut.value.trim();
    const nombre = tNombre.value.trim();
    const empresa = tEmpresa.value.trim();
    const pat = document.getElementById('t-patente').value.trim();

    // CANDADO: No permite guardar si faltan datos esenciales
    if (!rut || !nombre || !empresa) {
        alert("❌ ERROR: El RUT, Nombre y Empresa son obligatorios.");
        return;
    }

    await guardarRegistro({
        tipo: "TRANSPORTE",
        guardia: document.getElementById('t-guardia-id').value,
        rut, nombre, empresa, patente: pat
    });
    await aprenderPatente(pat);
    e.target.reset();
};

// --- LÓGICA DE MAESTRO (CON DETECCIÓN DE DUPLICADOS) ---
document.getElementById('form-maestro').onsubmit = async (e) => {
    e.preventDefault();
    const rut = document.getElementById('m-rut').value.trim();
    const nombre = document.getElementById('m-nombre').value.trim();
    const empresa = document.getElementById('m-empresa').value.trim();

    if (!rut || !nombre || !empresa) {
        alert("❌ Todos los campos son obligatorios.");
        return;
    }

    try {
        // BUSCAR DUPLICADO
        const q = query(collection(db, "conductores"), where("rut", "==", rut));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            alert(`⚠️ El conductor con RUT ${rut} ya está registrado.`);
            return;
        }

        await addDoc(collection(db, "conductores"), { rut, nombre, empresa });
        alert("✅ Conductor agregado exitosamente.");
        e.target.reset();
        document.getElementById('modal-conductor').style.display = 'none';
    } catch (error) {
        alert("Error al procesar el maestro.");
    }
};

// --- FUNCIONES AUXILIARES ---
async function guardarRegistro(datos) {
    try {
        await addDoc(collection(db, "ingresos"), {
            ...datos,
            fecha: new Date().toLocaleDateString('es-CL'),
            hora: new Date().toLocaleTimeString('es-CL')
        });
        alert("Registro Guardado");
    } catch (e) { alert("Error al guardar"); }
}

async function aprenderPatente(p) {
    if (p && !maestroPatentes.includes(p)) {
        await addDoc(collection(db, "patentes"), { patente: p });
    }
}

function formatearRUT(rut) {
    let valor = rut.replace(/\./g, '').replace('-', '');
    if (valor.length < 2) return valor;
    let cuerpo = valor.slice(0, -1);
    let dv = valor.slice(-1).toUpperCase();
    return cuerpo + '-' + dv;
}

// --- GESTIÓN DE MODALES Y TABS ---
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

document.getElementById('btn-gestionar-guardias').onclick = () => document.getElementById('modal-gestion-guardias').style.display='flex';
document.getElementById('btn-cerrar-gestion').onclick = () => document.getElementById('modal-gestion-guardias').style.display='none';
document.getElementById('btn-abrir-reportes').onclick = () => document.getElementById('modal-reportes').style.display='flex';
document.getElementById('btn-cerrar-reportes').onclick = () => document.getElementById('modal-reportes').style.display='none';
document.getElementById('btn-abrir-modal').onclick = () => document.getElementById('modal-conductor').style.display='flex';
document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-conductor').style.display='none';

document.getElementById('m-rut').oninput = (e) => e.target.value = formatearRUT(e.target.value);
