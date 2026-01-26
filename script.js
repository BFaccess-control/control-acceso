import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, getDocs, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// --- SESIÓN Y ROLES (MEJORADO: SEGURIDAD PARTE 2) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        
        // Verificamos si es admin consultando la colección secreta en Firebase
        await configurarPermisosSeguros(user.email);
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

async function configurarPermisosSeguros(email) {
    const adminPanel = document.getElementById('admin-panel');
    const btnGestionar = document.getElementById('btn-gestionar-guardias');
    const btnMaestro = document.getElementById('btn-abrir-modal');
    
    try {
        const adminRef = doc(db, "admins", email);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
            const datosAdmin = adminSnap.data(); // Leemos los datos del documento (rol, etc)
            
            // SI ES CUALQUIER JEFE (está en la colección)
            adminPanel.style.display = 'flex';
            
            // Solo quien tenga el valor "administrador" en el campo 'rol' puede gestionar guardias
            btnGestionar.style.display = (datosAdmin.rol === "administrador") ? 'block' : 'none';
            
            btnMaestro.style.display = 'block'; 
            console.log("Acceso Jefatura detectado. Rol:", datosAdmin.rol);
        } else {
            // ES GUARDIA
            adminPanel.style.display = 'none';
            btnMaestro.style.display = 'block';
            console.log("Acceso Guardia detectado");
        }
    } catch (error) {
        console.error("Error verificando permisos:", error);
    }
}

document.getElementById('btn-login').onclick = () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(() => alert("Error de acceso"));
};

document.getElementById('btn-logout').onclick = () => { signOut(auth); };

// --- FUNCIONES DE FORMATEO ---
function formatearRUT(rut) {
    let v = rut.replace(/[^\dkK]/g, "");
    if (v.length > 1) v = v.slice(0, -1) + "-" + v.slice(-1);
    return v.toUpperCase();
}

function formatearPatente(val) {
    let v = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (v.length > 4) v = v.slice(0, -2) + "-" + v.slice(-2);
    return v.substring(0, 7);
}

// --- AUTOCOMPLETADO (RUT Y PATENTES) ---
onSnapshot(collection(db, "conductores"), (snap) => { maestros = snap.docs.map(d => d.data()); });
onSnapshot(collection(db, "vehiculos"), (snap) => { maestroPatentes = snap.docs.map(d => d.data()); });

function activarAutocompletadoRUT(idInput, idBox) {
    const input = document.getElementById(idInput);
    input.oninput = (e) => {
        const val = e.target.value = formatearRUT(e.target.value);
        const bLimpia = val.replace(/-/g, "");
        const box = document.getElementById(idBox);
        box.innerHTML = "";
        if (bLimpia.length < 3) return;
        maestros.filter(m => m.rut.replace(/-/g, "").startsWith(bLimpia)).forEach(p => {
            const d = document.createElement('div'); d.className="sugerencia-item"; d.textContent=`${p.rut} | ${p.nombre}`;
            d.onclick = () => {
                input.value = p.rut;
                if(idInput === 't-rut') {
                    document.getElementById('t-nombre').value = p.nombre;
                    document.getElementById('t-empresa').value = p.empresa;
                } else {
                    document.getElementById('v-nombre').value = p.nombre;
                    document.getElementById('v-representa').value = p.empresa || "";
                }
                box.innerHTML = "";
            };
            box.appendChild(d);
        });
    };
}

function activarAutocompletadoPatente(idInput, idBox) {
    const input = document.getElementById(idInput);
    input.oninput = (e) => {
        const val = e.target.value = formatearPatente(e.target.value);
        const box = document.getElementById(idBox);
        box.innerHTML = "";
        if (val.length < 2) return;
        const bLimpia = val.replace(/-/g, "");
        maestroPatentes.filter(p => p.patente.replace(/-/g, "").startsWith(bLimpia)).forEach(item => {
            const d = document.createElement('div'); d.className="sugerencia-item"; d.textContent=item.patente;
            d.onclick = () => { input.value = item.patente; box.innerHTML=""; };
            box.appendChild(d);
        });
    };
}

activarAutocompletadoRUT('t-rut', 't-sugerencias');
activarAutocompletadoRUT('v-rut', 'v-sugerencias-rut');
activarAutocompletadoPatente('t-patente', 'p-sugerencias');
activarAutocompletadoPatente('v-patente', 'v-sugerencias-patente');

// --- GUARDADO Y AUTO-APRENDIZAJE ---
const guardarRegistro = async (data) => {
    const ahora = new Date();
    data.fecha = ahora.toLocaleDateString('es-CL');
    data.hora = ahora.toLocaleTimeString('es-CL', { hour12: false });
    const anio = ahora.getFullYear(), mes = String(ahora.getMonth() + 1).padStart(2, '0'), dia = String(ahora.getDate()).padStart(2, '0');
    data.fechaFiltro = `${anio}-${mes}-${dia}`;
    await addDoc(collection(db, "ingresos"), data);
    alert("Registro guardado con éxito");
};

const aprenderPatente = async (pat) => {
    if (pat && pat.length >= 6 && !maestroPatentes.some(p => p.patente === pat)) {
        await addDoc(collection(db, "vehiculos"), { patente: pat });
    }
};

document.getElementById('form-transporte').onsubmit = async (e) => {
    e.preventDefault();
    const pat = document.getElementById('t-patente').value;
    await guardarRegistro({
        tipo: "TRANSPORTE",
        guardia: document.getElementById('t-guardia-id').value,
        rut: document.getElementById('t-rut').value,
        nombre: document.getElementById('t-nombre').value,
        empresa: document.getElementById('t-empresa').value,
        patente: pat
    });
    await aprenderPatente(pat);
    e.target.reset();
};

document.getElementById('form-visitas').onsubmit = async (e) => {
    e.preventDefault();
    const pat = document.getElementById('v-patente').value;
    await guardarRegistro({
        tipo: "VISITA",
        guardia: document.getElementById('v-guardia-id').value,
        rut: document.getElementById('v-rut').value,
        nombre: document.getElementById('v-nombre').value,
        empresa: document.getElementById('v-representa').value,
        motivo: document.getElementById('v-motivo').value,
        patente: pat || "PEATON"
    });
    await aprenderPatente(pat);
    e.target.reset();
    document.getElementById('v-patente').style.display = 'none';
};

// --- EXPORTAR EXCEL (CON COLUMNA GUARDIA) ---
document.getElementById('btn-exportar').onclick = async () => {
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;
    const tipoF = document.getElementById('filtro-tipo').value;
    
    if(!inicio || !fin) return alert("Por favor, seleccione un rango de fechas.");
    
    const snap = await getDocs(collection(db, "ingresos"));
    let filtrados = snap.docs.map(d => d.data()).filter(r => {
        const cF = r.fechaFiltro >= inicio && r.fechaFiltro <= fin;
        const cT = (tipoF === "TODOS") || (r.tipo === tipoF);
        return cF && cT;
    });

    if(filtrados.length === 0) return alert("Sin datos para este rango.");

    // Orden Cronológico
    filtrados.sort((a, b) => {
        const fechaA = a.fechaFiltro + a.hora;
        const fechaB = b.fechaFiltro + b.hora;
        return fechaA.localeCompare(fechaB);
    });

    // Mapeado de Columnas (Ahora incluye "Guardia")
    const datosOrdenados = filtrados.map(r => {
        const fila = {
            "Fecha": r.fecha,
            "Hora": r.hora,
            "Tipo": r.tipo,
            "Guardia": r.guardia || "No especificado", // <-- Nueva columna agregada
            "Rut": r.rut,
            "Nombre": r.nombre,
            "Empresa": r.empresa,
            "Patente": r.patente
        };
        if (r.motivo) fila["Motivo"] = r.motivo;
        return fila;
    });

    const ws = XLSX.utils.json_to_sheet(datosOrdenados), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_Prosud_${tipoF}.xlsx`);
};

// --- GUARDIAS Y NAVEGACIÓN ---
onSnapshot(collection(db, "lista_guardias"), (s) => {
    listaGuardias = s.docs.map(d => ({id: d.id, ...d.data()}));
    ['t-guardia-id', 'v-guardia-id'].forEach(id => {
        const sel = document.getElementById(id);
        if(sel) {
            sel.innerHTML = '<option value="">-- Guardia --</option>';
            listaGuardias.forEach(g => sel.innerHTML += `<option value="${g.nombre}">${g.nombre}</option>`);
        }
    });
    const adm = document.getElementById('lista-guardias-admin');
    if(adm) {
        adm.innerHTML = "";
        listaGuardias.forEach(g => {
            adm.innerHTML += `<div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee;"><span>${g.nombre}</span><button onclick="borrarG('${g.id}')" style="color:red; border:none; background:none; cursor:pointer;">✖</button></div>`;
        });
    }
});

window.borrarG = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, "lista_guardias", id)); };
document.getElementById('btn-add-guardia').onclick = async () => { const n = document.getElementById('nuevo-guardia-nombre'); if(n.value) { await addDoc(collection(db, "lista_guardias"), {nombre: n.value}); n.value = ""; } };
document.getElementById('v-check-vehiculo').onchange = (e) => document.getElementById('v-patente').style.display = e.target.checked ? 'block' : 'none';
document.getElementById('btn-tab-transporte').onclick = () => { document.getElementById('sec-transporte').style.display='block'; document.getElementById('sec-visitas').style.display='none'; document.getElementById('btn-tab-transporte').classList.add('active'); document.getElementById('btn-tab-visitas').classList.remove('active'); };
document.getElementById('btn-tab-visitas').onclick = () => { document.getElementById('sec-visitas').style.display='block'; document.getElementById('sec-transporte').style.display='none'; document.getElementById('btn-tab-visitas').classList.add('active'); document.getElementById('btn-tab-transporte').classList.remove('active'); };
document.getElementById('btn-gestionar-guardias').onclick = () => document.getElementById('modal-gestion-guardias').style.display='flex';
document.getElementById('btn-cerrar-gestion').onclick = () => document.getElementById('modal-gestion-guardias').style.display='none';
document.getElementById('btn-abrir-reportes').onclick = () => document.getElementById('modal-reportes').style.display='flex';
document.getElementById('btn-cerrar-reportes').onclick = () => document.getElementById('modal-reportes').style.display='none';
document.getElementById('btn-abrir-modal').onclick = () => document.getElementById('modal-conductor').style.display='flex';
document.getElementById('btn-cerrar-modal').onclick = () => document.getElementById('modal-conductor').style.display='none';
document.getElementById('m-rut').oninput = (e) => e.target.value = formatearRUT(e.target.value);
document.getElementById('form-maestro').onsubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "conductores"), { rut: document.getElementById('m-rut').value, nombre: document.getElementById('m-nombre').value, empresa: document.getElementById('m-empresa').value });
    alert("Maestro Actualizado"); e.target.reset(); document.getElementById('modal-conductor').style.display = 'none';
};


