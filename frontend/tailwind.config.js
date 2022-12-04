/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            screens: {
                wide: '1340px'
            },
            colors: {
                primary: '#00f662',
                faint: '#a8b3c4',
                'border-light': '#2d3240',
                'card-color': '#232732'
            }
        }
    },
    plugins: []
};
