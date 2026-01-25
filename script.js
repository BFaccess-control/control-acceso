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

// 1. CARGA INICIAL DE DATOS (Guardias y Maestro para autocompletado)
async function cargarDatosIniciales() {
    // Cargar Guardias
    const qG = query(collection(db, "lista_guardias"), orderBy("nombre"));
    const snapG = await getDocs(qG);
    const selectT = document.getElementById('t-guardia-id');
    const selectV = document.getElementById('v-guardia-id');
    const listaG = document.getElementById('lista-guardias-ul'); // Para el panel de gestión
    
    let options = '<option value="">-- Seleccione Guardia --</option>';
    let itemsLi = '';

    snapG.forEach(docSnap => {
        const g = docSnap.data();
        options += `<option value="${g.nombre}">${g.nombre}</option>`;
        itemsLi += `<li>${g.nombre} <button onclick="eliminarGuardia('${docSnap.id}')">❌</button></li>`;
    });

    if(selectT) selectT.innerHTML = options;
    if(selectV) selectV.innerHTML = options;
    if(listaG) listaG.innerHTML = itemsLi;

    // Cargar Maestro para autocompletado de RUT
    const qM = collection(db, "conductores");
    const snapM = await getDocs(qM);
    maestros = snapM.docs.map(d => d.data());
}

// 2. LÓGICA DE LOGIN Y ROLES (Tu correo es Admin)
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        cargarDatosIniciales();
        // Solo tú ves el botón de gestión de guardias
        if (user.email === 'bfernandez@prosud.cl') {
            document.getElementById('btn-gestionar-guardias').style.display = 'block';
        }
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

// 3. AUTOCOMPLETADO DE RUT (Reparado)
document.getElementById('t-rut').oninput = (e) => {
    const val = e.target.value;
    const sugerencias = maestros.filter(m => m.rut.includes(val));
    const box = document.getElementById('t-sugerencias');
    box.innerHTML = '';
    if (val.length > 2) {
        sugerencias.forEach(s => {
            const div = document.createElement('div');
            div.className = 'sugerencia-item';
            div.innerText = `${s.rut} - ${s.nombre}`;
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

// 4. REPORTES EXCEL (Reparado)
document.getElementById('btn-exportar').onclick = async () => {
    const q = query(collection(db, "registros"), orderBy("fecha", "desc"));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => {
        const r = d.data();
        return {
            Fecha: r.fecha, Hora: r.hora, Tipo: r.tipo, RUT: r.rut, 
            Nombre: r.nombre, Empresa: r.empresa, Patente: r.patente, 
            Guardia: r.guardia || "No registrado"
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    XLSX.writeFile(wb, "Reporte_Prosud.xlsx");
};

// 5. FUNCIONES DE INTERFAZ (Modales y Tabs)
document.getElementById('btn-tab-transporte').onclick = () => {
    document.getElementById('sec-transporte').style.display='block';
    document.getElementById('sec-visitas').style.display='none';
};
document.getElementById('btn-tab-visitas').onclick = () => {
    document.getElementById('sec-visitas').style.display='block';
    document.getElementById('sec-transporte').style.display='none';
};
document.getElementById('btn-gestionar-guardias').onclick = () => document.getElementById('modal-gestion-guardias').style.display='flex';
document.getElementById('btn-cerrar-gestion').onclick = () => document.getElementById('modal-gestion-guardias').style.display='none';
document.getElementById('btn-abrir-reportes').onclick = () => document.getElementById('modal-reportes').style.display='flex';
document.getElementById('btn-cerrar-reportes').onclick = () => document.getElementById('modal-reportes').style.display='none';
document.getElementById('btn-logout').onclick = () => signOut(auth);

// 6. GUARDAR REGISTROS
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

    if(!data.guardia) return alert("Seleccione Guardia");
    await addDoc(collection(db, "registros"), data);
    alert("Guardado");
    location.reload();
}

document.getElementById('btn-save-t').onclick = () => guardar('TRANSPORTE');
document.getElementById('btn-save-v').onclick = () => guardar('VISITA');

// 7. GESTIÓN DE GUARDIAS (Añadir/Eliminar)
document.getElementById('form-add-guardia').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nuevo-guardia-nombre').value;
    await addDoc(collection(db, "lista_guardias"), { nombre });
    alert("Guardia añadido");
    cargarDatosIniciales();
};

window.eliminarGuardia = async (id) => {
    if(confirm("¿Eliminar guardia?")) {
        await deleteDoc(doc(db, "lista_guardias", id));
        cargarDatosIniciales();
    }
};
