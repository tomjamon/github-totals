// Récupérer les options sauvegardées à partir de chrome.storage
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['voirResume', 'voirTotaux'], (result) => {
        if (result.voirResume) {
            document.getElementById('voirResume').value = result.voirResume;
        }
        if (result.voirTotaux) {
            document.getElementById('voirTotaux').value = result.voirTotaux;
        }
    });
});

// Sauvegarder les options choisies dans chrome.storage
document.getElementById('saveOptions').addEventListener('click', () => {
    let voirResume = document.getElementById('voirResume').value;
    let voirTotaux = document.getElementById('voirTotaux').value;

    chrome.storage.sync.set({ voirResume, voirTotaux }, () => {
        console.log(`L'option "Voir Résumé" est maintenant : ${voirResume}`);
        console.log(`L'option "Voir Totaux" est maintenant : ${voirTotaux}`);
        alert('Options sauvegardées !');
    });
});
