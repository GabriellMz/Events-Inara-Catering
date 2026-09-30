const supabaseUrl = 'https://kkkonlfsmdvquuhrresu.supabase.co';
const supabaseKey = 'sb_publishable_S9LKSwIG3iOTXxHQc9J4rg_7Ok8-zcv';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // 1. MANEJO DE SESIÓN Y RUTAS
    // ==========================================
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'reset-password.html') {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            alert('El enlace de recuperación ha expirado o es inválido.');
            window.location.href = 'login.html';
            return;
        }

        const formNuevaPassword = document.getElementById('formNuevaPassword');
        if(formNuevaPassword) {
            formNuevaPassword.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nuevaPass = document.getElementById('nuevaPass').value;
                
                const { error } = await supabaseClient.auth.updateUser({ password: nuevaPass });
                if (!error) {
                    alert('¡Contraseña actualizada con éxito! Por favor, inicia sesión de nuevo.');
                    await supabaseClient.auth.signOut();
                    window.location.href = 'login.html';
                } else {
                    alert('Hubo un error al actualizar la contraseña: ' + error.message);
                }
            });
        }
        return; 
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    let profile = null;
    let userRole = null;

    if (session && session.user) {
        const { data: adminData } = await supabaseClient.from('administradores').select('*').eq('correo', session.user.email).single();
        if (adminData) {
            profile = adminData;
            userRole = 'admin';
        } else {
            const { data: clientData } = await supabaseClient.from('clientes').select('*').eq('correo', session.user.email).single();
            if (clientData) {
                profile = clientData;
                userRole = 'cliente';
            }
        }
    }

    if (session && profile) {
        if (currentPage === 'login.html') return window.location.href = userRole === 'admin' ? 'dashboard.html' : 'index.html';
        if (currentPage === 'dashboard.html' && userRole !== 'admin') return window.location.href = 'index.html';
    } else {
        if (currentPage === 'dashboard.html') return window.location.href = 'login.html';
    }

    const authContainers = document.querySelectorAll('.auth-container');
    authContainers.forEach(container => {
        if (session && profile) {
            const primerNombre = profile.nombre_completo ? profile.nombre_completo.split(' ')[0] : 'Usuario';
            
            const btnDashboard = userRole === 'admin' 
                ? `<a href="dashboard.html" class="nav-icon-btn" title="Volver al Dashboard" style="color: var(--accent); text-decoration: none;"><i class="fa-solid fa-chart-line"></i></a>` 
                : '';

            container.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="text-accent fw-bold" style="font-size: 0.9rem;">Hola, ${primerNombre}</span>
                    ${btnDashboard}
                    <button class="nav-icon-btn btn-logout" title="Cerrar Sesión" style="background: none; border: none; padding: 0;">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            `;
        }
    });

    document.addEventListener('click', async (e) => {
        const logoutBtn = e.target.closest('.btn-logout');
        if (logoutBtn) {
            e.preventDefault(); 
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html'; 
        }
    });

    const formRecuperarPass = document.getElementById('formRecuperarPass');
    if (formRecuperarPass) {
        formRecuperarPass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('emailRecuperacion').value;
            const redirectUrl = window.location.href.replace('login.html', 'reset-password.html');

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

            if (error) alert('Error al enviar el enlace. Verifica que el correo esté registrado.');
            else {
                alert('¡Enlace enviado! Revisa tu bandeja de entrada o carpeta de SPAM.');
                document.querySelector('#modalRecuperar .btn-close').click();
                formRecuperarPass.reset();
            }
        });
    }

    // ==========================================
    // 3. INICIO DE SESIÓN CON VALIDACIÓN DE ROL ESTRICTA
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 1. Obtener la pestaña activa seleccionada por el usuario
            const tabActiva = document.querySelector('.role-btn.active').getAttribute('data-role'); // 'cliente' o 'admin'
            
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = document.getElementById('loginPassword').value;
            
            // 2. Intentar loguearse en Supabase
            const { error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (authError) return alert('Credenciales incorrectas o usuario no encontrado.');
            
            // 3. Verificar el rol REAL del usuario en la base de datos
            const { data: isAdmin } = await supabaseClient.from('administradores').select('id').eq('correo', email).single();
            const rolReal = isAdmin ? 'admin' : 'cliente';

            // 4. BLOQUEO: Si la pestaña no coincide con su rol real, lo echamos
            if (tabActiva !== rolReal) {
                await supabaseClient.auth.signOut(); 
                return alert(`⚠️ ACCESO DENEGADO.\n\nEstás intentando ingresar desde la pestaña de ${tabActiva.toUpperCase()},\npero tu cuenta pertenece al grupo de ${rolReal.toUpperCase()}.\n\nPor favor, cambia de pestaña e inténtalo de nuevo.`);
            }

            // 5. Si todo está correcto, lo dejamos pasar
            window.location.href = isAdmin ? 'dashboard.html' : 'index.html';
        });
    }

    // ==========================================
    // 4. RESTO DEL CÓDIGO CRUD Y DASHBOARD
    // ==========================================
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnCrear = document.getElementById('btnCrearCuenta');
            const textoOriginal = btnCrear.innerText;
            btnCrear.innerText = 'CREANDO CUENTA...';
            btnCrear.disabled = true;

            try {
                const dni = document.getElementById('regDni').value;
                const nombre = document.getElementById('regNombre').value;
                const email = document.getElementById('regEmail').value;
                const telefono = document.getElementById('regTelefono').value;
                const password = document.getElementById('registerPassword').value;

                const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

                if (authError) return alert('Error al crear la cuenta: ' + authError.message);

                if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                    return alert('Este correo electrónico ya está registrado en el sistema. Por favor, inicia sesión.');
                }

                if (authData.user) {
                    const { error: insertError } = await supabaseClient.from('clientes').insert([
                        { dni: dni, nombre_completo: nombre, correo: email, telefono: telefono }
                    ]);

                    if (insertError) {
                        if (insertError.message.includes('duplicate key')) alert('Error: El DNI o Correo ingresado ya existe en nuestra base de datos.');
                        else alert('Error al guardar el perfil: ' + insertError.message);
                    } else {
                        await supabaseClient.auth.signOut(); 
                        alert('¡Cuenta creada exitosamente! Ya puedes iniciar sesión en el sistema.');
                        document.getElementById('btnSwitchToLogin').click();
                        registerForm.reset();
                    }
                }
            } catch (err) { console.error(err); } 
            finally {
                btnCrear.innerText = textoOriginal;
                btnCrear.disabled = false;
            }
        });
    }

    const formContacto = document.getElementById('formContacto');
    if (formContacto) {
        formContacto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombreInput') ? document.getElementById('nombreInput').value : 'Cliente';
            const correo = document.getElementById('correoInput') ? document.getElementById('correoInput').value : '';
            const telefono = document.getElementById('telefonoInput') ? document.getElementById('telefonoInput').value : '';
            const selectEvento = document.getElementById('tipoEvento');
            const tipoEvento = selectEvento ? selectEvento.options[selectEvento.selectedIndex].text : 'General';
            const fecha = document.getElementById('fechaInput') ? document.getElementById('fechaInput').value : null;
            const invitados = document.getElementById('invitadosInput') ? parseInt(document.getElementById('invitadosInput').value) : null;
            const detalles = document.getElementById('detallesInput') ? document.getElementById('detallesInput').value : '';

            const clienteIdInsert = userRole === 'cliente' ? profile.id : null;

            const { error: insertError } = await supabaseClient.from('reservas').insert([{ 
                cliente_id: clienteIdInsert, tipo_evento: tipoEvento, fecha_tentativa: fecha, cantidad_invitados: invitados, 
                detalles: `Nombre: ${nombre} | Correo: ${correo} | Teléfono: ${telefono} | Msj: ${detalles}`, estado: 'Pendiente' 
            }]);

            if (insertError) return alert('Hubo un error al guardar la reserva: ' + insertError.message);
            const numeroWhatsApp = '51937220742'; 
            const mensaje = `¡Hola INARA! Soy ${nombre}. Deseo cotizar un evento de tipo: *${tipoEvento}*.%0A%0A*Fecha:* ${fecha}%0A*Invitados:* ${invitados}%0A*Detalles:* ${detalles}%0A*Mi teléfono:* ${telefono}%0A*Mi correo:* ${correo}`;
            window.open(`https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensaje}`, '_blank');
            formContacto.reset();
        });
    }

    const tablaReservasBody = document.getElementById('tablaReservasBody');
    if (tablaReservasBody) {
        cargarServiciosAdmin();
        cargarReservasAdmin();
        cargarUsuariosAdmin();
        cargarExtrasAdmin(); 
        cargarProveedoresAdmin(); 
    }

    const formCrudServicio = document.getElementById('formCrudServicio');
    if (formCrudServicio) {
        formCrudServicio.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('idServicioInput').value;
            const nombre = document.getElementById('nombreServInput').value;
            const precio = document.getElementById('precioServInput').value;
            const descripcion = document.getElementById('descServInput').value;
            const fileInput = document.getElementById('imgServInput');
            let imagen_url = document.getElementById('imgServOculto').value;

            if (fileInput.files.length > 0) imagen_url = `./assets/img/${fileInput.files[0].name}`;
            if (!imagen_url && !id) return alert('Selecciona una imagen.');

            if (id) await supabaseClient.from('servicios').update({ nombre, precio, imagen_url, descripcion }).eq('id', id);
            else await supabaseClient.from('servicios').insert([{ nombre, precio, imagen_url, descripcion, estado: 'activo' }]);
            
            document.querySelector('#modalServicio .btn-close').click();
            cargarServiciosAdmin();
        });
    }

    const formCrudExtra = document.getElementById('formCrudExtra');
    if (formCrudExtra) {
        formCrudExtra.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('idExtraInput').value;
            const nombre = document.getElementById('nombreExtraInput').value;
            const precio = document.getElementById('precioExtraInput').value;
            const descripcion = document.getElementById('descExtraInput').value;

            if (id) await supabaseClient.from('extras').update({ nombre, precio_unitario: precio, descripcion }).eq('id', id);
            else await supabaseClient.from('extras').insert([{ nombre, precio_unitario: precio, descripcion }]);
            
            document.querySelector('#modalExtra .btn-close').click();
            cargarExtrasAdmin();
        });
    }

    const formCrudProveedor = document.getElementById('formCrudProveedor');
    if (formCrudProveedor) {
        formCrudProveedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('idProveedorInput').value;
            const empresa = document.getElementById('empresaProvInput').value;
            const contacto = document.getElementById('contactoProvInput').value;
            const telefono = document.getElementById('telefonoProvInput').value;
            const especialidad = document.getElementById('especialidadProvInput').value;

            if (id) await supabaseClient.from('proveedores').update({ nombre_empresa: empresa, contacto, telefono, especialidad }).eq('id', id);
            else await supabaseClient.from('proveedores').insert([{ nombre_empresa: empresa, contacto, telefono, especialidad }]);
            
            document.querySelector('#modalProveedor .btn-close').click();
            cargarProveedoresAdmin();
        });
    }

    const formNotaReserva = document.getElementById('formNotaReserva');
    if (formNotaReserva) {
        formNotaReserva.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idReserva = document.getElementById('idReservaNotaInput').value;
            const nota = document.getElementById('notaReservaInput').value;
            const estadoNuevo = document.getElementById('estadoReservaSelect').value;

            const { error } = await supabaseClient.from('reservas').update({ nota_admin: nota, estado: estadoNuevo }).eq('id', idReserva);
            
            if (!error) {
                document.querySelector('#modalNotaReserva .btn-close').click();
                cargarReservasAdmin(); 
            } else alert('Error al actualizar la solicitud.');
        });
    }

    const formEditarRol = document.getElementById('formEditarRol');
    if (formEditarRol) {
        formEditarRol.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idUsuario = document.getElementById('idUsuarioRol').value;
            const rolActual = document.getElementById('rolActualUsuario').value;
            const nuevoRol = document.getElementById('selectRolUsuario').value;

            if (rolActual === nuevoRol) return document.querySelector('#modalEditarRol .btn-close').click();

            const tablaOrigen = rolActual === 'admin' ? 'administradores' : 'clientes';
            const tablaDestino = nuevoRol === 'admin' ? 'administradores' : 'clientes';

            const { data: userData } = await supabaseClient.from(tablaOrigen).select('*').eq('id', idUsuario).single();

            if (userData) {
                const { error: insertError } = await supabaseClient.from(tablaDestino).insert([{
                    dni: userData.dni, nombre_completo: userData.nombre_completo, correo: userData.correo, telefono: userData.telefono
                }]);
                if (!insertError) {
                    await supabaseClient.from(tablaOrigen).delete().eq('id', idUsuario);
                    document.querySelector('#modalEditarRol .btn-close').click();
                    cargarUsuariosAdmin(); 
                } else alert('Error al mover de tabla: ' + insertError.message);
            }
        });
    }
}); 

// ==========================================
// FUNCIONES GLOBALES (DASHBOARD)
// ==========================================
window.listaServiciosGlobal = [];
window.listaReservasGlobal = [];
window.listaAdminsGlobal = [];
window.listaClientesGlobal = [];
window.listaExtrasGlobal = [];
window.listaProveedoresGlobal = [];

async function cargarReservasAdmin() {
    const tabla = document.getElementById('tablaReservasBody');
    if (!tabla) return;
    const { data: reservas, error } = await supabaseClient.from('reservas').select('*').order('id', { ascending: false });
    if (error) return;

    window.listaReservasGlobal = reservas || []; 
    tabla.innerHTML = '';
    
    // VARIABLES KPI ACTUALIZADAS
    let countPendiente = 0, countProceso = 0, countConcreto = 0, countNoConcreto = 0;
    
    if(window.listaReservasGlobal.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay reservas pendientes.</td></tr>';
    } else {
        window.listaReservasGlobal.forEach(res => {
            
            // CONTEO DE KPI
            if(res.estado === 'Pendiente') countPendiente++;
            if(res.estado === 'En proceso') countProceso++;
            if(res.estado === 'Se concretó') countConcreto++;
            if(res.estado === 'No se concretó') countNoConcreto++;

            const tr = document.createElement('tr');
            tr.className = 'border-bottom';
            const infoBasica = `<div class="fw-bold text-accent">${res.detalles.split('|')[0].replace('Nombre: ', '')}</div><small>${res.detalles.split('|')[1].replace('Correo: ', '')}</small>`;
            
            let badgeClase = 'estado-pendiente';
            if(res.estado === 'En proceso') badgeClase = 'estado-proceso';
            if(res.estado === 'Se concretó') badgeClase = 'estado-concreto';
            if(res.estado === 'No se concretó') badgeClase = 'estado-noconcreto';

            tr.innerHTML = `
                <td class="p-4 py-3">${infoBasica}</td>
                <td class="p-4 py-3"><span class="fw-medium"><i class="fa-solid fa-champagne-glasses text-secondary me-2"></i>${res.tipo_evento}</span></td>
                <td class="p-4 py-3">
                    <div class="small fw-bold">${res.fecha_tentativa || 'Sin fecha'}</div>
                    <div class="small text-secondary mt-1">${res.cantidad_invitados ? res.cantidad_invitados + ' pax' : 'N/A'}</div>
                </td>
                <td class="p-4 py-3"><span class="badge-estado ${badgeClase}"><i class="fa-solid fa-circle me-1" style="font-size:8px;"></i> ${res.estado.toUpperCase()}</span></td>
                <td class="p-4 py-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary me-2" onclick="abrirModalNota(${res.id})" data-bs-toggle="modal" data-bs-target="#modalNotaReserva"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarReserva(${res.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    }

    // ACTUALIZAR NÚMEROS KPI EN EL DOM
    document.getElementById('kpiTotal').innerText = window.listaReservasGlobal.length;
    document.getElementById('kpiPendientes').innerText = countPendiente;
    document.getElementById('kpiProceso').innerText = countProceso;
    document.getElementById('kpiConcreto').innerText = countConcreto;
    document.getElementById('kpiNoConcreto').innerText = countNoConcreto; // La nueva tarjeta roja
}

window.abrirModalNota = function(idReserva) {
    const reserva = window.listaReservasGlobal.find(r => r.id === idReserva);
    if(reserva) {
        document.getElementById('idReservaNotaInput').value = reserva.id;
        document.getElementById('notaReservaInput').value = reserva.nota_admin || ''; 
        const estadoSelect = document.getElementById('estadoReservaSelect');
        if(estadoSelect.querySelector(`option[value="${reserva.estado}"]`)) estadoSelect.value = reserva.estado;
        else estadoSelect.value = 'Pendiente'; 
    }
}
window.eliminarReserva = async function(id) {
    if (confirm('¿Borrar esta solicitud?')) { await supabaseClient.from('reservas').delete().eq('id', id); cargarReservasAdmin(); }
}

async function cargarServiciosAdmin() {
    const tabla = document.getElementById('tablaServiciosBody');
    if (!tabla) return;
    const { data: servicios } = await supabaseClient.from('servicios').select('*').order('id', { ascending: true });
    window.listaServiciosGlobal = servicios || [];
    tabla.innerHTML = '';
    window.listaServiciosGlobal.forEach(serv => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4"><img src="${serv.imagen_url || './assets/img/matrimonio.jpg'}" class="rounded shadow-sm" style="width: 60px; height: 40px; object-fit: cover;"></td>
            <td class="p-4 fw-bold text-accent">${serv.nombre}</td>
            <td class="p-4">S/ ${serv.precio || '0.00'}</td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicion(${serv.id})" data-bs-toggle="modal" data-bs-target="#modalServicio"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarServicio(${serv.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}
window.prepararEdicion = function(id) {
    const servicio = window.listaServiciosGlobal.find(s => s.id === id);
    if(servicio) {
        document.getElementById('idServicioInput').value = servicio.id;
        document.getElementById('nombreServInput').value = servicio.nombre;
        document.getElementById('precioServInput').value = servicio.precio;
        document.getElementById('descServInput').value = servicio.descripcion;
        document.getElementById('imgServOculto').value = servicio.imagen_url;
        document.getElementById('imgServInput').removeAttribute('required'); 
        document.getElementById('tituloModalServicio').innerText = 'Editar Servicio';
    }
}
window.limpiarModalServicio = function() { 
    document.getElementById('formCrudServicio').reset(); 
    document.getElementById('idServicioInput').value = ''; 
    document.getElementById('tituloModalServicio').innerText = 'Nuevo Servicio';
}
window.eliminarServicio = async function(id) {
    if (confirm('¿Eliminar servicio?')) { await supabaseClient.from('servicios').delete().eq('id', id); cargarServiciosAdmin(); }
}

async function cargarExtrasAdmin() {
    const tabla = document.getElementById('tablaExtrasBody');
    if (!tabla) return;
    const { data: extras } = await supabaseClient.from('extras').select('*').order('id', { ascending: true });
    window.listaExtrasGlobal = extras || [];
    tabla.innerHTML = '';
    
    if(window.listaExtrasGlobal.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay extras registrados.</td></tr>';
        return;
    }

    window.listaExtrasGlobal.forEach(ext => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4 fw-bold text-accent">${ext.nombre}</td>
            <td class="p-4 small">${ext.descripcion || '-'}</td>
            <td class="p-4 fw-medium text-success">S/ ${ext.precio_unitario || '0.00'}</td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicionExtra(${ext.id})" data-bs-toggle="modal" data-bs-target="#modalExtra"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarExtra(${ext.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}
window.prepararEdicionExtra = function(id) {
    const ext = window.listaExtrasGlobal.find(e => e.id === id);
    if(ext) {
        document.getElementById('idExtraInput').value = ext.id;
        document.getElementById('nombreExtraInput').value = ext.nombre;
        document.getElementById('precioExtraInput').value = ext.precio_unitario;
        document.getElementById('descExtraInput').value = ext.descripcion;
        document.getElementById('tituloModalExtra').innerText = 'Editar Extra';
    }
}
window.limpiarModalExtra = function() { 
    document.getElementById('formCrudExtra').reset(); 
    document.getElementById('idExtraInput').value = ''; 
    document.getElementById('tituloModalExtra').innerText = 'Nuevo Extra';
}
window.eliminarExtra = async function(id) {
    if (confirm('¿Eliminar este extra?')) { await supabaseClient.from('extras').delete().eq('id', id); cargarExtrasAdmin(); }
}

async function cargarProveedoresAdmin() {
    const tabla = document.getElementById('tablaProveedoresBody');
    if (!tabla) return;
    const { data: prov } = await supabaseClient.from('proveedores').select('*').order('id', { ascending: true });
    window.listaProveedoresGlobal = prov || [];
    tabla.innerHTML = '';

    if(window.listaProveedoresGlobal.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay proveedores registrados.</td></tr>';
        return;
    }

    window.listaProveedoresGlobal.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4 fw-bold text-accent"><i class="fa-solid fa-building me-2 text-secondary"></i>${p.nombre_empresa}</td>
            <td class="p-4"><i class="fa-solid fa-user me-2 text-secondary"></i>${p.contacto || '-'}</td>
            <td class="p-4"><i class="fa-solid fa-phone me-2 text-secondary"></i>${p.telefono || '-'}</td>
            <td class="p-4"><span class="badge bg-dynamic-alt text-accent border border-1">${p.especialidad}</span></td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicionProveedor(${p.id})" data-bs-toggle="modal" data-bs-target="#modalProveedor"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarProveedor(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}
window.prepararEdicionProveedor = function(id) {
    const p = window.listaProveedoresGlobal.find(e => e.id === id);
    if(p) {
        document.getElementById('idProveedorInput').value = p.id;
        document.getElementById('empresaProvInput').value = p.nombre_empresa;
        document.getElementById('contactoProvInput').value = p.contacto;
        document.getElementById('telefonoProvInput').value = p.telefono;
        document.getElementById('especialidadProvInput').value = p.especialidad;
        document.getElementById('tituloModalProveedor').innerText = 'Editar Proveedor';
    }
}
window.limpiarModalProveedor = function() { 
    document.getElementById('formCrudProveedor').reset(); 
    document.getElementById('idProveedorInput').value = ''; 
    document.getElementById('tituloModalProveedor').innerText = 'Nuevo Proveedor';
}
window.eliminarProveedor = async function(id) {
    if (confirm('¿Eliminar este proveedor?')) { await supabaseClient.from('proveedores').delete().eq('id', id); cargarProveedoresAdmin(); }
}

async function cargarUsuariosAdmin() {
    const tablaAdmin = document.getElementById('tablaUsuariosAdminBody');
    const tablaCliente = document.getElementById('tablaUsuariosClienteBody');
    if (!tablaAdmin || !tablaCliente) return;

    const { data: admins } = await supabaseClient.from('administradores').select('*').order('id', { ascending: true });
    const { data: clientes } = await supabaseClient.from('clientes').select('*').order('id', { ascending: true });

    window.listaAdminsGlobal = admins || [];
    window.listaClientesGlobal = clientes || [];
    
    tablaAdmin.innerHTML = '';
    tablaCliente.innerHTML = '';

    if(window.listaAdminsGlobal.length === 0) tablaAdmin.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay administradores registrados.</td></tr>';
    else window.listaAdminsGlobal.forEach(per => renderUsuarioFila(per, tablaAdmin, 'admin'));

    if(window.listaClientesGlobal.length === 0) tablaCliente.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay clientes registrados.</td></tr>';
    else window.listaClientesGlobal.forEach(per => renderUsuarioFila(per, tablaCliente, 'cliente'));
}
function renderUsuarioFila(per, tablaBody, tipo) {
    const tr = document.createElement('tr');
    tr.className = 'border-bottom';
    tr.innerHTML = `
        <td class="p-4 fw-bold text-secondary">${per.dni || 'S/N'}</td>
        <td class="p-4 fw-bold text-accent"><i class="fa-solid fa-circle-user fs-4 me-2 align-middle"></i> ${per.nombre_completo || 'Usuario'}</td>
        <td class="p-4 small">
            <div><i class="fa-solid fa-envelope me-1 text-secondary"></i> ${per.correo}</div>
            <div class="mt-1"><i class="fa-solid fa-phone me-1 text-secondary"></i> ${per.telefono || 'Sin registro'}</div>
        </td>
        <td class="p-4 text-end">
            <button class="btn btn-sm btn-outline-primary me-2" onclick="prepararEdicionRol(${per.id}, '${tipo}')" data-bs-toggle="modal" data-bs-target="#modalEditarRol"><i class="fa-solid fa-user-gear"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${per.id}, '${tipo}')"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    tablaBody.appendChild(tr);
}
window.prepararEdicionRol = function(idUsuario, tipo) {
    const usuario = tipo === 'admin' ? window.listaAdminsGlobal.find(u => u.id === idUsuario) : window.listaClientesGlobal.find(u => u.id === idUsuario);
    if(usuario) {
        document.getElementById('idUsuarioRol').value = usuario.id;
        document.getElementById('rolActualUsuario').value = tipo;
        document.getElementById('selectRolUsuario').value = tipo;
    }
}
window.eliminarUsuario = async function(id, tipo) {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a este ${tipo}?`)) {
        const tabla = tipo === 'admin' ? 'administradores' : 'clientes';
        const { error } = await supabaseClient.from(tabla).delete().eq('id', id);
        if (!error) cargarUsuariosAdmin();
    }
}

// ==========================================
// MÓDULO DE RESEÑAS EN EL INDEX.HTML
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const contenedorResenas = document.getElementById('contenedorResenas');
    if (contenedorResenas) {
        cargarResenasPublicas();
        configurarEstrellas();
    }

    const formNuevaResena = document.getElementById('formNuevaResena');
    if (formNuevaResena) {
        formNuevaResena.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) { alert('Debes iniciar sesión como cliente para poder dejar una reseña.'); window.location.href = 'login.html'; return; }

            const { data: perfilData } = await supabaseClient.from('clientes').select('id, nombre_completo').eq('correo', session.user.email).single();
            if (!perfilData) return alert('Solo los clientes pueden dejar reseñas.');

            const calificacion = document.getElementById('calificacionInput').value;
            const comentario = document.getElementById('comentarioResenaInput').value;

            const { error } = await supabaseClient.from('resenas').insert([{ cliente_id: perfilData.id, calificacion: parseInt(calificacion), comentario: comentario, estado: 'aprobado' }]);

            if (!error) {
                alert('¡Gracias por tu reseña! Se ha publicado correctamente.');
                document.querySelector('#modalNuevaResena .btn-close').click();
                formNuevaResena.reset();
                cargarResenasPublicas(); 
            } else alert('Hubo un error al publicar la reseña: ' + error.message);
        });
    }

    async function cargarResenasPublicas() {
        const { data: resenas, error } = await supabaseClient.from('resenas').select(`id, calificacion, comentario, clientes (nombre_completo)`).eq('estado', 'aprobado').order('fecha_publicacion', { ascending: false }).limit(3); 

        if (error || !resenas) return contenedorResenas.innerHTML = '<p class="text-secondary text-center">No se pudieron cargar los testimonios.</p>';
        if (resenas.length === 0) return contenedorResenas.innerHTML = '<p class="text-secondary text-center">Aún no hay reseñas. ¡Sé el primero en dejar una!</p>';

        contenedorResenas.innerHTML = '';
        resenas.forEach(res => {
            let estrellasHTML = '';
            for(let i=0; i<5; i++) {
                if (i < res.calificacion) estrellasHTML += '<i class="fa-solid fa-star"></i>';
                else estrellasHTML += '<i class="fa-regular fa-star text-secondary" style="opacity:0.3"></i>';
            }
            const nombreCliente = res.clientes ? res.clientes.nombre_completo : 'Familia INARA';
            const col = document.createElement('div');
            col.className = 'col-lg-4';
            col.innerHTML = `
                <div class="card-dynamic p-4 h-100">
                    <div class="d-flex text-accent mb-3 fs-5">${estrellasHTML}</div>
                    <p class="fst-italic mb-4">"${res.comentario}"</p>
                    <h6 class="fw-bold mb-0 text-accent">${nombreCliente}</h6>
                    <small class="text-secondary">Cliente Verificado</small>
                </div>
            `;
            contenedorResenas.appendChild(col);
        });
    }

    function configurarEstrellas() {
        const estrellas = document.querySelectorAll('#starRatingSelector i');
        const inputOculto = document.getElementById('calificacionInput');
        estrellas.forEach(star => {
            star.addEventListener('click', function() {
                const valor = parseInt(this.getAttribute('data-val'));
                inputOculto.value = valor;
                estrellas.forEach((s, index) => {
                    if (index < valor) { s.classList.remove('fa-regular', 'text-secondary'); s.classList.add('fa-solid', 'text-accent'); } 
                    else { s.classList.remove('fa-solid', 'text-accent'); s.classList.add('fa-regular', 'text-secondary'); }
                });
            });
        });
        if(estrellas.length > 0) estrellas[4].click();
    }
});