// Financial Astrology Trading Strategies - Interactive Features

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add current date display
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    console.log('Page loaded:', now.toLocaleDateString('en-US', options));

    // Highlight today's section based on hash
    function highlightSection() {
        const hash = window.location.hash;
        if (hash) {
            const section = document.querySelector(hash);
            if (section) {
                section.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.3)';
                setTimeout(() => {
                    section.style.boxShadow = '';
                }, 2000);
            }
        }
    }

    window.addEventListener('hashchange', highlightSection);
    highlightSection();

    // Card hover effects
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    // Add click-to-copy for important values
    document.querySelectorAll('.stat-value').forEach(stat => {
        stat.style.cursor = 'pointer';
        stat.title = 'Click to copy';
        stat.addEventListener('click', () => {
            navigator.clipboard.writeText(stat.textContent).then(() => {
                const original = stat.textContent;
                stat.textContent = 'Copied!';
                setTimeout(() => {
                    stat.textContent = original;
                }, 1000);
            });
        });
    });
});
