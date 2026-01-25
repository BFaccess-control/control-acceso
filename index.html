import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// OPTIMIZACIÓN: Cargar guardias en tus selects actuales
async function cargarGuardias() {
    const qGuardias = query(collection(db, "lista_guardias"), orderBy("nombre"));
    const snapGuardias = await getDocs(qGuardias);
    
    // Usamos los IDs que encontraste en tu HTML
    const selectT = document.getElementById('t-guardia-id'); // Select de Transporte
    const selectV = document.getElementById('v-guardia-id'); // Select de Visitas
    
    const optionsHtml = snapGuardias.docs.map(doc => {
        const g = doc.data();
        return `<option value="${g.nombre}">${g.nombre}</option>`;
    }).join('');

    const placeholder = '<option value="">-- Seleccione Guardia --</option>';
    if(selectT) selectT.innerHTML = placeholder + optionsHtml;
    if(selectV) selectV.innerHTML = placeholder + optionsHtml;
}

// Lógica de Login (Simplificada)
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) { alert("Error: Credenciales incorrectas"); }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-body').style.display = 'block';
        cargarGuardias(); // Carga la lista de nombres apenas entras
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-body').style.display = 'none';
    }
});

document.getElementById('btn-logout').onclick = () => signOut(auth);

// GUARDAR REGISTRO CON TRAZABILIDAD
async function guardarRegistro(tipo) {
    const data = {
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        tipo: tipo
    };

    if (tipo === 'TRANSPORTE') {
        data.rut = document.getElementById('t-rut').value;
        data.nombre = document.getElementById('t-nombre').value;
        data.empresa = document.getElementById('t-empresa').value;
        data.patente = document.getElementById('t-patente').value;
        data.guardia = document.getElementById('t-guardia-id').value; // Captura del select de transporte
    } else {
        data.rut = document.getElementById('v-rut').value;
        data.nombre = document.getElementById('v-nombre').value;
        data.empresa = document.getElementById('v-empresa').value;
        data.patente = document.getElementById('v-patente').value || "N/A";
        data.guardia = document.getElementById('v-guardia-id').value; // Captura del select de visitas
    }

    if (!data.guardia) return alert("⚠️ Debe seleccionar su nombre de la lista de Guardias");
    if (!data.rut || !data.nombre) return alert("❌ Complete los campos obligatorios");

    try {
        await addDoc(collection(db, "registros"), data);
        alert("✅ Registro Guardado con éxito");
        location.reload(); 
    } catch (e) { alert("Error al guardar en base de datos"); }
}

// Vinculación con los botones de tu HTML
document.getElementById('btn-save-t').onclick = () => guardarRegistro('TRANSPORTE');
document.getElementById('btn-save-v').onclick = () => guardarRegistro('VISITA');

// EXPORTAR EXCEL (Ya incluye la columna Guardia)
document.getElementById('btn-exportar').onclick = async () => {
    const q = query(collection(db, "registros"), orderBy("fecha", "desc"));
    const snap = await getDocs(q);
    const excelData = snap.docs.map(doc => {
        const r = doc.data();
        return {
            Fecha: r.fecha,
            Hora: r.hora,
            Tipo: r.tipo,
            RUT: r.rut,
            Nombre: r.nombre,
            Empresa: r.empresa,
            Patente: r.patente,
            Guardia_Responsable: r.guardia // Esto aparecerá en el Excel
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros Prosud");
    XLSX.writeFile(wb, `Reporte_Control_${new Date().toLocaleDateString()}.xlsx`);
};

// Mantener funciones de navegación de pestañas (Tabs)
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
