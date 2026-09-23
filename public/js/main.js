document.addEventListener('DOMContentLoaded', () => {
    const htmlTag = document.documentElement;
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    const savedTheme = localStorage.getItem('inaraTheme') || 'light';
    
    setTheme(savedTheme);

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = htmlTag.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });
    });

    function setTheme(theme) {
        htmlTag.setAttribute('data-theme', theme);
        localStorage.setItem('inaraTheme', theme);
        
        toggleBtns.forEach(btn => {
            const icon = btn.querySelector('i.fa-moon, i.fa-sun');
            if(icon) {
                if (theme === 'dark') {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventoParam = urlParams.get('evento');
    
    if (eventoParam) {
        const selectEvento = document.getElementById('tipoEvento');
        if (selectEvento) {
            selectEvento.value = eventoParam;
        }
    }

    const roleBtns = document.querySelectorAll('.role-btn');
    const registerLinkContainer = document.getElementById('registerLinkContainer');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const btnSwitchToRegister = document.getElementById('btnSwitchToRegister');
    const btnSwitchToLogin = document.getElementById('btnSwitchToLogin');

    if (roleBtns.length > 0) {
        roleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                roleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.getAttribute('data-role') === 'admin') {
                    if (registerLinkContainer) registerLinkContainer.classList.add('d-none');
                    if (registerForm && !registerForm.classList.contains('d-none')) {
                        registerForm.classList.add('d-none');
                        loginForm.classList.remove('d-none');
                    }
                } else {
                    if (registerLinkContainer) registerLinkContainer.classList.remove('d-none');
                }
            });
        });
    }

    if (btnSwitchToRegister && btnSwitchToLogin) {
        btnSwitchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('d-none');
            registerForm.classList.remove('d-none');
        });

        btnSwitchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('d-none');
            loginForm.classList.remove('d-none');
        });
    }

    const togglePasswords = document.querySelectorAll('.toggle-password');
    
    togglePasswords.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const inputId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(inputId);
            
            if (passwordInput) {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            }
        });
    });
});