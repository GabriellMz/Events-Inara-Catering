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
            const icon = btn.querySelector('i');
            if (theme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
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
});