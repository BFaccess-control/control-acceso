import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// --- FUNCIONES DE SOPORTE (Restauradas para que nada se bloquee) ---
const formatearRUT = (rut) => {
    let valor = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    if (valor.length < 2) return valor;
    let cuerpo = valor.slice(0, -1);
    let dv = valor.slice(-1);
    return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};

const formatearPatente = (p) => p.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);

// --- CARGA DE DATOS ---
async function cargarDatosIniciales() {
    try {
        // Cargar Guardias
        const snapG = await getDocs(query(collection(db, "lista_guardias"), orderBy("nombre")));
        const selectT = document.getElementById('t-guardia-id');
        const selectV = document.getElementById('v-guardia-id');
        const listaG = document.getElementById('lista-guardias-ul');
        
        let options = '<option value="">-- Seleccione Guardia --</option>';
        let itemsLi = '';
        snapG.forEach(d => {
            const g = d.data();
            options += `<option value="${g.nombre}">${g.nombre}</option>`;
            itemsLi += `<li>${g.nombre} <button onclick="eliminarGuardia('${d.id}')" style="margin-left:10px; background:none; border:none; cursor:pointer;">❌</button></li>`;
        });
        if(selectT) selectT.innerHTML = options;
        if(selectV) selectV.innerHTML = options;
        if(listaG) listaG.innerHTML = itemsLi;

        // Cargar Maestro
        const snapM = await getDocs(collection(db, "conductores"));
        maestros = snapM.docs.map(d => d.data());
    } catch (e) { console.error("Error cargando datos:", e); }
}

// --- LÓGICA DE SESIÓN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        cargarDatosIniciales();
        if (user.email === 'bfernandez@prosud.cl') {
            document.getElementById('btn-gestionar-guardias').style.display = 'block';
        }
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } 
    catch (e) { alert("Error en login"); }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- NAVEGACIÓN (Restaurada) ---
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

// --- AUTOCOMPLETADO Y FORMATEO ---
document.getElementById('t-rut').oninput = (e) => {
    e.target.value = formatearRUT(e.target.value);
    const val = e.target.value;
    const box = document.getElementById('t-sugerencias');
    box.innerHTML = '';
    if (val.length > 3) {
        const sug = maestros.filter(m => m.rut.includes(val));
        sug.forEach(s => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            div.innerText = `${s.rut} | ${s.nombre}`;
            div.onclick = () => {
                document.getElementById('t-rut').value = s.rut;
                document.getElementById('t-nombre').value = s.nombre;
                document.getElementById('t-empresa').value = s.empresa;
                box.innerHTML = '';
            };
            box.appendChild(div);
        });
    }
};

document.getElementById('v-rut').oninput = (e) => e.target.value = formatearRUT(e.target.value);
document.getElementById('t-patente').oninput = (e) => e.target.value = formatearPatente(e.target.value);
document.getElementById('v-patente').oninput = (e) => e.target.value = formatearPatente(e.target.value);

// --- GUARDAR REGISTROS ---
async function guardar(tipo) {
    const data = {
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        tipo: tipo,
        rut: document.getElementById(tipo === 'TRANSPORTE' ? 't-rut' : 'v-rut').value,
        nombre: document.getElementById(tipo === 'TRANSPORTE' ? 't-nombre' : 'v-nombre').value,
        empresa: document.getElementById(tipo === 'TRANSPORTE' ? 't-empresa' : 'v-empresa').value,
        patente: document.getElementById(tipo === 'TRANSPORTE' ? 't-patente' : 'v-patente').value || "N/A",
        guardia: document.getElementById(tipo === 'TRANSPORTE' ? 't-guardia-id' : 'v-guardia-id').value
    };

    if(!data.guardia || !data.rut || !data.nombre) return alert("Complete todos los campos y seleccione Guardia");

    try {
        await addDoc(collection(db, "registros"), data);
        alert("✅ Guardado con éxito");
        location.reload();
    } catch (e) { alert("Error al guardar"); }
}

document.getElementById('btn-save-t').onclick = () => guardar('TRANSPORTE');
document.getElementById('btn-save-v').onclick = () => guardar('VISITA');

// --- MODALES ---
document.getElementById('btn-gestionar-guardias').onclick = () => document.getElementById('modal-gestion-guardias').style.display='flex';
document.getElementById('btn-cerrar-gestion').onclick = () => document.getElementById('modal-gestion-guardias').style.display='none';
document.getElementById('btn-abrir-reportes').onclick = () => document.getElementById('modal-reportes').style.display='flex';
document.getElementById('btn-cerrar-reportes').onclick = () => document.getElementById('modal-reportes').style.display='none';
document.getElementById('btn-abrir-modal').onclick = () => document.getElementById('modal-conductor').style.display='flex';
document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-conductor').style.display='none';

// --- GESTIÓN DE GUARDIAS ---
document.getElementById('form-add-guardia').onsubmit = async (e) => {
    e.preventDefault();
    const n = document.getElementById('nuevo-guardia-nombre').value;
    await addDoc(collection(db, "lista_guardias"), { nombre: n });
    e.target.reset();
    cargarDatosIniciales();
};

window.eliminarGuardia = async (id) => {
    if(confirm("¿Eliminar?")) {
        await deleteDoc(doc(db, "lista_guardias", id));
        cargarDatosIniciales();
    }
};

// --- EXPORTAR EXCEL ---
document.getElementById('btn-exportar').onclick = async () => {
    const snap = await getDocs(query(collection(db, "registros"), orderBy("fecha", "desc")));
    const data = snap.docs.map(d => {
        const r = d.data();
        return {
            Fecha: r.fecha, Hora: r.hora, Tipo: r.tipo, RUT: r.rut, 
            Nombre: r.nombre, Empresa: r.empresa, Patente: r.patente, 
            Guardia: r.guardia
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Reporte_Prosud.xlsx");
};

// MAESTRO CONDUCTORES
document.getElementById('m-rut').oninput = (e) => e.target.value = formatearRUT(e.target.value);
document.getElementById('form-maestro').onsubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "conductores"), {
        rut: document.getElementById('m-rut').value,
        nombre: document.getElementById('m-nombre').value,
        empresa: document.getElementById('m-empresa').value
    });
    alert("Maestro Actualizado");
    e.target.reset();
    document.getElementById('modal-conductor').style.display='none';
    cargarDatosIniciales();
};
