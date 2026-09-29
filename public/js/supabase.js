const supabaseUrl = 'https://kkkonlfsmdvquuhrresu.supabase.co';
const supabaseKey = 'sb_publishable_S9LKSwIG3iOTXxHQc9J4rg_7Ok8-zcv';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // 1. MANEJO DE SESIÓN CON TABLAS SEPARADAS
    // ==========================================
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    let profile = null;
    let userRole = null;

    if (session && session.user) {
        // Buscamos primero en Administradores
        const { data: adminData } = await supabaseClient.from('administradores').select('*').eq('correo', session.user.email).single();
        
        if (adminData) {
            profile = adminData;
            userRole = 'admin';
        } else {
            // Si no está, lo buscamos en Clientes
            const { data: clientData } = await supabaseClient.from('clientes').select('*').eq('correo', session.user.email).single();
            if (clientData) {
                profile = clientData;
                userRole = 'cliente';
            }
        }
    }

    if (session && profile) {
        if (currentPage === 'login.html') {
            window.location.href = userRole === 'admin' ? 'dashboard.html' : 'index.html';
            return;
        }
        if (currentPage === 'dashboard.html' && userRole !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
    } else {
        if (currentPage === 'dashboard.html') {
            window.location.href = 'login.html';
            return;
        }
    }

    const authContainers = document.querySelectorAll('.auth-container');
    authContainers.forEach(container => {
        if (session && profile) {
            const primerNombre = profile.nombre_completo ? profile.nombre_completo.split(' ')[0] : 'Usuario';
            container.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="text-accent fw-bold" style="font-size: 0.9rem;">Hola, ${primerNombre}</span>
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

    // ==========================================
    // 2. FORMULARIOS DE AUTENTICACIÓN
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = document.getElementById('loginPassword').value;

            const { error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (authError) {
                alert('Credenciales incorrectas o usuario no encontrado.');
                return;
            }

            // Validar de qué tabla proviene para redirigir
            const { data: isAdmin } = await supabaseClient.from('administradores').select('id').eq('correo', email).single();
            window.location.href = isAdmin ? 'dashboard.html' : 'index.html';
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dni = document.getElementById('regDni').value;
            const nombre = document.getElementById('regNombre').value;
            const email = document.getElementById('regEmail').value;
            const telefono = document.getElementById('regTelefono').value;
            const password = document.getElementById('registerPassword').value;

            const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

            if (authError) {
                alert('Error al crear la cuenta: ' + (authError.message.includes('already registered') ? 'El correo ya está registrado.' : authError.message));
                return;
            }

            if (authData.user) {
                // Ahora los registros van directamente a la tabla 'clientes'
                const { error: insertError } = await supabaseClient.from('clientes').insert([
                    { dni: dni, nombre_completo: nombre, correo: email, telefono: telefono }
                ]);

                if (insertError) {
                    alert('Hubo un error al guardar el perfil: ' + insertError.message);
                } else {
                    await supabaseClient.auth.signOut();
                    alert('¡Cuenta creada exitosamente! Ya puedes iniciar sesión con tus credenciales.');
                    document.getElementById('btnSwitchToLogin').click();
                    registerForm.reset();
                }
            }
        });
    }

    // ==========================================
    // RECUPERACIÓN DE CONTRASEÑA
    // ==========================================
    const formRecuperarPass = document.getElementById('formRecuperarPass');
    if (formRecuperarPass) {
        formRecuperarPass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('emailRecuperacion').value;

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/login.html', 
            });

            if (error) {
                alert('Error al enviar el enlace. Verifica que el correo esté registrado.');
            } else {
                alert('¡Enlace enviado! Revisa tu bandeja de entrada o carpeta de SPAM.');
                document.querySelector('#modalRecuperar .btn-close').click();
                formRecuperarPass.reset();
            }
        });
    }

    // ==========================================
    // 3. ENVÍO DE RESERVAS (CONTACTO)
    // ==========================================
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

            // Si es un admin haciendo prueba, no vinculamos cliente_id para que no crashee
            const clienteIdInsert = userRole === 'cliente' ? profile.id : null;

            const { error: insertError } = await supabaseClient.from('reservas').insert([{ 
                cliente_id: clienteIdInsert, 
                tipo_evento: tipoEvento, 
                fecha_tentativa: fecha, 
                cantidad_invitados: invitados, 
                detalles: `Nombre: ${nombre} | Correo: ${correo} | Teléfono: ${telefono} | Msj: ${detalles}`, 
                estado: 'pendiente' 
            }]);

            if (insertError) {
                alert('Hubo un error al guardar la reserva: ' + insertError.message);
                return;
            }

            const numeroWhatsApp = '51937220742'; 
            const mensaje = `¡Hola INARA! Soy ${nombre}. Deseo cotizar un evento de tipo: *${tipoEvento}*.%0A%0A*Fecha:* ${fecha}%0A*Invitados:* ${invitados}%0A*Detalles:* ${detalles}%0A*Mi teléfono:* ${telefono}%0A*Mi correo:* ${correo}`;
            window.open(`https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensaje}`, '_blank');
            formContacto.reset();
        });
    }

    // ==========================================
    // 4. INICIALIZAR DASHBOARD 
    // ==========================================
    const tablaServiciosBody = document.getElementById('tablaServiciosBody');
    if (tablaServiciosBody) {
        cargarServiciosAdmin();
        cargarReservasAdmin();
        cargarUsuariosAdmin(); // Carga las 2 tablas
    }

    // ==========================================
    // 5. CRUD DE SERVICIOS
    // ==========================================
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

            if (fileInput.files.length > 0) {
                imagen_url = `./assets/img/${fileInput.files[0].name}`;
            }

            if (!imagen_url && !id) {
                alert('Por favor selecciona una imagen de tu computadora para el servicio.');
                return;
            }

            if (id) {
                await supabaseClient.from('servicios').update({ nombre, precio, imagen_url, descripcion }).eq('id', id);
            } else {
                await supabaseClient.from('servicios').insert([{ nombre, precio, imagen_url, descripcion, estado: 'activo' }]);
            }
            window.location.reload();
        });
    }

    // ==========================================
    // 6. GUARDAR NOTA EN RESERVA
    // ==========================================
    const formNotaReserva = document.getElementById('formNotaReserva');
    if (formNotaReserva) {
        formNotaReserva.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idReserva = document.getElementById('idReservaNotaInput').value;
            const nota = document.getElementById('notaReservaInput').value;

            const { error } = await supabaseClient.from('reservas').update({ nota_admin: nota }).eq('id', idReserva);
            
            if (!error) {
                document.querySelector('#modalNotaReserva .btn-close').click();
                cargarReservasAdmin(); 
            } else {
                alert('Error al guardar la nota.');
            }
        });
    }

    // ==========================================
    // 7. MIGRAR ROL (MOVER DE TABLA)
    // ==========================================
    const formEditarRol = document.getElementById('formEditarRol');
    if (formEditarRol) {
        formEditarRol.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idUsuario = document.getElementById('idUsuarioRol').value;
            const rolActual = document.getElementById('rolActualUsuario').value;
            const nuevoRol = document.getElementById('selectRolUsuario').value;

            if (rolActual === nuevoRol) {
                document.querySelector('#modalEditarRol .btn-close').click();
                return;
            }

            const tablaOrigen = rolActual === 'admin' ? 'administradores' : 'clientes';
            const tablaDestino = nuevoRol === 'admin' ? 'administradores' : 'clientes';

            // 1. Extraemos los datos de la tabla vieja
            const { data: userData } = await supabaseClient.from(tablaOrigen).select('*').eq('id', idUsuario).single();

            if (userData) {
                // 2. Lo insertamos en la tabla nueva
                const { error: insertError } = await supabaseClient.from(tablaDestino).insert([{
                    dni: userData.dni,
                    nombre_completo: userData.nombre_completo,
                    correo: userData.correo,
                    telefono: userData.telefono
                }]);

                if (!insertError) {
                    // 3. Lo borramos de la tabla vieja
                    await supabaseClient.from(tablaOrigen).delete().eq('id', idUsuario);
                    document.querySelector('#modalEditarRol .btn-close').click();
                    cargarUsuariosAdmin(); // Recarga ambas tablas en vivo
                } else {
                    alert('Error al mover de tabla: ' + insertError.message);
                }
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

async function cargarServiciosAdmin() {
    const tabla = document.getElementById('tablaServiciosBody');
    if (!tabla) return;
    const { data: servicios, error } = await supabaseClient.from('servicios').select('*').order('id', { ascending: true });
    if (error) return;

    window.listaServiciosGlobal = servicios;
    tabla.innerHTML = '';
    if(servicios.length === 0) return tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay servicios registrados.</td></tr>';
    
    servicios.forEach(serv => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4"><img src="${serv.imagen_url || './assets/img/matrimonio.jpg'}" class="rounded shadow-sm" style="width: 60px; height: 40px; object-fit: cover;"></td>
            <td class="p-4 fw-bold text-accent">${serv.nombre}</td>
            <td class="p-4">S/ ${serv.precio || '0.00'}</td>
            <td class="p-4"><span class="badge ${serv.estado === 'activo' ? 'bg-success' : 'bg-secondary'} px-3 py-2 rounded-pill shadow-sm">${serv.estado.toUpperCase()}</span></td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicion(${serv.id})" data-bs-toggle="modal" data-bs-target="#modalServicio" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-warning me-2" onclick="toggleEstadoServicio(${serv.id}, '${serv.estado}')" title="Ocultar / Activar"><i class="fa-solid fa-eye-slash"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarServicio(${serv.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

window.prepararEdicion = function(id) {
    const servicio = window.listaServiciosGlobal.find(s => s.id === id);
    if(servicio) {
        document.getElementById('tituloModalServicio').innerText = 'Modificar Servicio';
        document.getElementById('idServicioInput').value = servicio.id;
        document.getElementById('nombreServInput').value = servicio.nombre;
        document.getElementById('precioServInput').value = servicio.precio;
        document.getElementById('descServInput').value = servicio.descripcion;
        document.getElementById('imgServOculto').value = servicio.imagen_url;
        document.getElementById('imgServInput').value = ''; 
        document.getElementById('imgServInput').removeAttribute('required'); 
        
        const txtActual = document.getElementById('imgActualTexto');
        txtActual.classList.remove('d-none');
        txtActual.querySelector('span').innerText = servicio.imagen_url ? servicio.imagen_url.split('/').pop() : 'Ninguna';
        document.getElementById('btnGuardarServicio').innerText = 'ACTUALIZAR SERVICIO';
    }
}

window.limpiarModalServicio = function() {
    const form = document.getElementById('formCrudServicio');
    if (form) form.reset();
    document.getElementById('idServicioInput').value = '';
    document.getElementById('imgServOculto').value = '';
    document.getElementById('imgServInput').setAttribute('required', 'true');
    document.getElementById('imgActualTexto').classList.add('d-none');
    document.getElementById('tituloModalServicio').innerText = 'Registrar Servicio';
    document.getElementById('btnGuardarServicio').innerText = 'GUARDAR SERVICIO';
}

async function cargarReservasAdmin() {
    const tabla = document.getElementById('tablaReservasBody');
    if (!tabla) return;
    const { data: reservas, error } = await supabaseClient.from('reservas').select('*').order('id', { ascending: false });
    if (error) return;

    window.listaReservasGlobal = reservas; 
    tabla.innerHTML = '';
    if(reservas.length === 0) return tabla.innerHTML = '<tr><td colspan="6" class="text-center p-4">No hay reservas pendientes.</td></tr>';
    
    reservas.forEach(res => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        const infoBasica = res.detalles.split('|')[0] + '<br><small class="text-secondary">' + (res.detalles.split('|')[1] || '') + '</small>';
        const notaBtnColor = (res.nota_admin && res.nota_admin.trim() !== '') ? 'btn-primary' : 'btn-outline-secondary';
        const iconoNota = (res.nota_admin && res.nota_admin.trim() !== '') ? 'fa-comment-dots' : 'fa-comment';

        tr.innerHTML = `
            <td class="p-4 fw-medium text-accent">${infoBasica}</td>
            <td class="p-4 fw-bold">${res.tipo_evento}</td>
            <td class="p-4">
                <div class="small"><i class="fa-regular fa-calendar text-accent me-1"></i> ${res.fecha_tentativa || 'Sin fecha'}</div>
                <div class="small mt-1"><i class="fa-solid fa-users text-accent me-1"></i> ${res.cantidad_invitados ? res.cantidad_invitados + ' invitados' : 'N/A'}</div>
            </td>
            <td class="p-4"><span class="badge ${res.estado === 'pendiente' ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2 rounded-pill shadow-sm">${res.estado.toUpperCase()}</span></td>
            <td class="p-4 text-center">
                <button class="btn btn-sm ${notaBtnColor} rounded-circle shadow-sm" onclick="abrirModalNota(${res.id})" data-bs-toggle="modal" data-bs-target="#modalNotaReserva" title="Anotaciones Internas">
                    <i class="fa-regular ${iconoNota}"></i>
                </button>
            </td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-success me-2" onclick="actualizarEstadoReserva(${res.id}, 'atendida')" title="Marcar como Atendida"><i class="fa-solid fa-check"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarReserva(${res.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

window.abrirModalNota = function(idReserva) {
    const reserva = window.listaReservasGlobal.find(r => r.id === idReserva);
    if(reserva) {
        document.getElementById('idReservaNotaInput').value = reserva.id;
        document.getElementById('notaReservaInput').value = reserva.nota_admin || ''; 
    }
}

// ==========================================
// GESTIÓN DE TABLAS SEPARADAS DE USUARIOS
// ==========================================
async function cargarUsuariosAdmin() {
    const tablaAdmin = document.getElementById('tablaUsuariosAdminBody');
    const tablaCliente = document.getElementById('tablaUsuariosClienteBody');
    if (!tablaAdmin || !tablaCliente) return;

    // Traemos de ambas tablas de forma independiente
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
            <button class="btn btn-sm btn-outline-primary me-2" onclick="prepararEdicionRol(${per.id}, '${tipo}')" data-bs-toggle="modal" data-bs-target="#modalEditarRol" title="Cambiar Rol"><i class="fa-solid fa-user-gear"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${per.id}, '${tipo}')" title="Eliminar Permanente"><i class="fa-solid fa-trash"></i></button>
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

// Función global para eliminar desde la tabla correspondiente
window.eliminarUsuario = async function(id, tipo) {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a este ${tipo}?`)) {
        const tabla = tipo === 'admin' ? 'administradores' : 'clientes';
        const { error } = await supabaseClient.from(tabla).delete().eq('id', id);
        
        if (!error) cargarUsuariosAdmin();
        else alert('No se pudo eliminar el usuario.');
    }
}

window.eliminarServicio = async function(id) {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
        await supabaseClient.from('servicios').delete().eq('id', id);
        cargarServiciosAdmin();
    }
}
window.toggleEstadoServicio = async function(id, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'suspendido' : 'activo';
    await supabaseClient.from('servicios').update({ estado: nuevoEstado }).eq('id', id);
    cargarServiciosAdmin();
}
window.eliminarReserva = async function(id) {
    if (confirm('¿Borrar esta solicitud del registro?')) {
        await supabaseClient.from('reservas').delete().eq('id', id);
        cargarReservasAdmin();
    }
}
window.actualizarEstadoReserva = async function(id, nuevoEstado) {
    await supabaseClient.from('reservas').update({ estado: nuevoEstado }).eq('id', id);
    cargarReservasAdmin();
}