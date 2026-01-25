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

// FUNCIONES DE FORMATEO
const formatearRUT = (r) => {
    let v = r.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    if (v.length < 2) return v;
    return v.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + v.slice(-1);
};

// CARGA DE DATOS (Mueve esto a una función global)
async function cargarDatos() {
    try {
        const snapG = await getDocs(query(collection(db, "lista_guardias"), orderBy("nombre")));
        const selectT = document.getElementById('t-guardia-id');
        const selectV = document.getElementById('v-guardia-id');
        const listaUl = document.getElementById('lista-guardias-ul');
        
        let opts = '<option value="">-- Seleccione Guardia --</option>';
        let items = '';
        snapG.forEach(d => {
            opts += `<option value="${d.data().nombre}">${d.data().nombre}</option>`;
            items += `<li>${d.data().nombre} <button onclick="window.eliminarG('${d.id}')">❌</button></li>`;
        });
        if(selectT) selectT.innerHTML = opts;
        if(selectV) selectV.innerHTML = opts;
        if(listaUl) listaUl.innerHTML = items;

        const snapM = await getDocs(collection(db, "conductores"));
        maestros = snapM.docs.map(d => d.data());
        console.log("Maestro cargado:", maestros.length);
    } catch (e) { console.error(e); }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        cargarDatos();
        if (user.email === 'bfernandez@prosud.cl') {
            document.getElementById('btn-gestionar-guardias').style.display = 'block';
        }
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

// LOGICA DE BOTONES (Aseguramos que existan)
document.addEventListener('click', async (e) => {
    if (e.target.id === 'btn-login') {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try { await signInWithEmailAndPassword(auth, email, pass); } catch (e) { alert("Error"); }
    }
    if (e.target.id === 'btn-logout') signOut(auth);
    if (e.target.id === 'btn-tab-transporte') {
        document.getElementById('sec-transporte').style.display='block';
        document.getElementById('sec-visitas').style.display='none';
    }
    if (e.target.id === 'btn-tab-visitas') {
        document.getElementById('sec-visitas').style.display='block';
        document.getElementById('sec-transporte').style.display='none';
    }
    if (e.target.id === 'btn-gestionar-guardias') document.getElementById('modal-gestion-guardias').style.display='flex';
    if (e.target.id === 'btn-cerrar-gestion') document.getElementById('modal-gestion-guardias').style.display='none';
    if (e.target.id === 'btn-abrir-reportes') document.getElementById('modal-reportes').style.display='flex';
    if (e.target.id === 'btn-cerrar-reportes') document.getElementById('modal-reportes').style.display='none';
    if (e.target.id === 'btn-abrir-modal') document.getElementById('modal-conductor').style.display='flex';
    if (e.target.id === 'btn-cerrar-modal') document.getElementById('modal-conductor').style.display='none';
    
    // EXPORTAR (Reparado)
    if (e.target.id === 'btn-exportar') {
        const snap = await getDocs(query(collection(db, "registros"), orderBy("fecha", "desc")));
        const rows = snap.docs.map(d => d.data());
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, "Reporte_Prosud.xlsx");
    }
});

// AUTOCOMPLETADO RUT
document.getElementById('t-rut').oninput = (e) => {
    e.target.value = formatearRUT(e.target.value);
    const val = e.target.value;
    const box = document.getElementById('t-sugerencias');
    box.innerHTML = '';
    if (val.length > 3) {
        maestros.filter(m => m.rut.includes(val)).forEach(s => {
            const d = document.createElement('div');
            d.className = 'sugerencia-item';
            d.innerText = s.rut + " | " + s.nombre;
            d.onclick = () => {
                document.getElementById('t-rut').value = s.rut;
                document.getElementById('t-nombre').value = s.nombre;
                document.getElementById('t-empresa').value = s.empresa;
                box.innerHTML = '';
            };
            box.appendChild(d);
        });
    }
};

// GUARDAR
window.guardarRegistro = async (tipo) => {
    const data = {
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        tipo: tipo,
        rut: document.getElementById(tipo==='TRANSPORTE'?'t-rut':'v-rut').value,
        nombre: document.getElementById(tipo==='TRANSPORTE'?'t-nombre':'v-nombre').value,
        empresa: document.getElementById(tipo==='TRANSPORTE'?'t-empresa':'v-empresa').value,
        patente: document.getElementById(tipo==='TRANSPORTE'?'t-patente':'v-patente').value || "N/A",
        guardia: document.getElementById(tipo==='TRANSPORTE'?'t-guardia-id':'v-guardia-id').value
    };
    if(!data.guardia || !data.nombre) return alert("Faltan datos");
    await addDoc(collection(db, "registros"), data);
    alert("OK"); location.reload();
};

document.getElementById('btn-save-t').onclick = () => window.guardarRegistro('TRANSPORTE');
document.getElementById('btn-save-v').onclick = () => window.guardarRegistro('VISITA');

window.eliminarG = async (id) => { if(confirm("¿Eliminar?")) { await deleteDoc(doc(db, "lista_guardias", id)); cargarDatos(); } };

document.getElementById('form-add-guardia').onsubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "lista_guardias"), { nombre: document.getElementById('nuevo-guardia-nombre').value });
    e.target.reset(); cargarDatos();
};
