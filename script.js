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

// --- SESIÓN Y PERMISOS ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        
        // Forzamos visibilidad inicial para evitar bloqueos
        document.getElementById('admin-panel').style.display = 'flex';
        
        cargarDatosGlobales();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

function cargarDatosGlobales() {
    // Escuchar Conductores
    onSnapshot(collection(db, "conductores"), (snap) => {
        maestros = snap.docs.map(d => d.data());
    });

    // Escuchar Guardias (COLECCIÓN: lista_guardias)
    onSnapshot(collection(db, "lista_guardias"), (snap) => {
        listaGuardias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Llenar selects de los formularios
        ['t-guardia-id', 'v-guardia-id'].forEach(id => {
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

        // Llenar lista en el modal de administración
        const admLista = document.getElementById('lista-guardias-admin');
        if (admLista) {
            admLista.innerHTML = "";
            listaGuardias.forEach(g => {
                const div = document.createElement('div');
                div.className = "sugerencia-item";
                div.style.display = "flex";
                div.style.justifyContent = "space-between";
                div.innerHTML = `<span>${g.nombre}</span><button onclick="window.eliminarG('${g.id}')" style="color:red; border:none; background:none; cursor:pointer;">✖</button>`;
                admLista.appendChild(div);
            });
        }
    });
}

// Global para borrar guardia
window.eliminarG = async (id) => {
    if(confirm("¿Eliminar guardia?")) await deleteDoc(doc(db, "lista_guardias", id));
};

// --- LÓGICA DE FORMULARIOS ---
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

// GUARDAR INGRESO TRANSPORTE (Con validación de campos vacíos)
document.getElementById('form-transporte').onsubmit = async (e) => {
    e.preventDefault();
    const guardia = document.getElementById('t-guardia-id').value;
    const nombre = document.getElementById('t-nombre').value.trim();
    const empresa = document.getElementById('t-empresa').value.trim();

    if (!guardia || !nombre || !empresa) {
        alert("❌ Error: Debe seleccionar un guardia y los datos del conductor no pueden estar vacíos.");
        return;
    }

    const ahora = new Date();
    await addDoc(collection(db, "ingresos"), {
        tipo: "TRANSPORTE",
        guardia,
        rut: document.getElementById('t-rut').value,
        nombre,
        empresa,
        patente: document.getElementById('t-patente').value,
        fecha: ahora.toLocaleDateString('es-CL'),
        hora: ahora.toLocaleTimeString('es-CL'),
        fechaFiltro: ahora.toISOString().split('T')[0]
    });
    alert("✅ Registro guardado");
    e.target.reset();
};

// GUARDAR EN MAESTRO (Evitando duplicados)
document.getElementById('form-maestro').onsubmit = async (e) => {
    e.preventDefault();
    const rut = document.getElementById('m-rut').value.trim();
    
    const q = query(collection(db, "conductores"), where("rut", "==", rut));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        alert("⚠️ Este RUT ya existe en el Maestro.");
        return;
    }

    await addDoc(collection(db, "conductores"), {
        rut,
        nombre: document.getElementById('m-nombre').value.trim(),
        empresa: document.getElementById('m-empresa').value.trim()
    });
    alert("✅ Conductor agregado al Maestro");
    document.getElementById('modal-conductor').style.display = 'none';
    e.target.reset();
};

// --- REPORTES Y MODALES ---
document.getElementById('btn-exportar').onclick = async () => {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;
    if(!inicio || !fin) return alert("Seleccione fechas");

    const snap = await getDocs(collection(db, "ingresos"));
    const filtrados = snap.docs.map(d => d.data()).filter(r => r.fechaFiltro >= inicio && r.fechaFiltro <= fin);
    
    if(filtrados.length === 0) return alert("Sin datos");

    const ws = XLSX.utils.json_to_sheet(filtrados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, "Reporte_Prosud.xlsx");
};

document.getElementById('btn-add-guardia').onclick = async () => {
    const n = document.getElementById('nuevo-guardia-nombre');
    if(n.value.trim()) {
        await addDoc(collection(db, "lista_guardias"), { nombre: n.value.trim() });
        n.value = "";
    }
};

// --- NAVEGACIÓN ---
document.getElementById('btn-login').onclick = () => {
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).catch(() => alert("Error"));
};
document.getElementById('btn-logout').onclick = () => signOut(auth);

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
