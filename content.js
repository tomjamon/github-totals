// Objet pour stocker les informations capturées
let assignations = {};

// Fonction pour capturer les données d'une ligne
function capturerDonneesLigne(row) {
    // Récupérer le titre de la ligne
    let titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] a');
    let title = titleElement ? titleElement.textContent.trim() : null;
    if (!title) {
        titleElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Title"] span');
        title = titleElement ? titleElement.textContent.trim() : null;
    }

    // Récupérer toutes les colonnes contenant des nombres (classe "firrQr")
    let colonnesNumeriques = row.querySelectorAll('[data-testid^="TableCell{row"][role="gridcell"]');

    // Stocker les sommes des colonnes dans un objet
    let sommesParColonne = {};

    // Parcourir chaque colonne pour vérifier si elle contient un nombre
    colonnesNumeriques.forEach(colonne => {
        // Récupérer le nom de la colonne (par exemple "Hrs spent")
        let nomColonne = colonne.getAttribute('data-testid');
        let match = nomColonne.match(/column: ([^}]*)/);
        if (match) {
            nomColonne = match[1];
        }

        // Vérifier si la colonne contient une valeur numérique
        let valeurElement = colonne.querySelector('.firrqR span');
        if (valeurElement) {
            let valeur = parseFloat(valeurElement.textContent.trim());
            if (!isNaN(valeur)) {
                // Si la colonne a déjà une somme, on ajoute à la somme existante
                if (!sommesParColonne[nomColonne]) {
                    sommesParColonne[nomColonne] = 0;
                }
                sommesParColonne[nomColonne] += valeur;
            }
        }
    });

    // Récupérer l'assigné
    let assigneeElement = row.querySelector('[data-testid*="TableCell{row"][data-testid*=", column: Assignees"] img');
    let assigneeName = assigneeElement ? assigneeElement.alt : null;

    // Si le titre est trouvé, on stocke les données dans l'objet assignations
    if (title) {
        if (!assignations[title]) {
            assignations[title] = {
                sommesColonnes: {},
                assignees: []
            };
        }

        // Mettre à jour les sommes des colonnes pour ce titre
        assignations[title].sommesColonnes = sommesParColonne;

        // Ajouter l'assigné s'il n'est pas déjà présent
        if (assigneeName && !assignations[title].assignees.includes(assigneeName)) {
            assignations[title].assignees.push(assigneeName);
        }
    }
}

function verifierTousLesLiens() {
    // Sélectionner toutes les lignes déjà présentes dans le DOM avec le rôle "row"
    let lignesExistantes = document.querySelectorAll('[role="row"]');

    // Parcourir toutes les lignes et capturer leurs données
    lignesExistantes.forEach(ligne => {
        console.log('Ligne existante détectée:', ligne);
        capturerDonneesLigne(ligne);
    });
}

// Fonction qui initialise l'observation du DOM pour les lignes
function observerTableau() {
    // Sélectionner le conteneur de défilement de la table
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');

    if (tableau) {
        verifierTousLesLiens();

        let observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Vérifier si le noeud ajouté est une ligne avec role="row"
                    if (node.nodeType === 1 && node.matches('[role="row"]')) {
                        // Capturer les données de la ligne ajoutée
                        capturerDonneesLigne(node);
                    }
                });
            });
        });

        // Observer les changements dans les lignes
        let config = { childList: true, subtree: true };
        observer.observe(tableau, config);

        console.log("Observation des lignes démarrée.");
    } else {
        console.log("Tableau non trouvé, réessayer...");
    }
}

// Vérification périodique pour s'assurer que le tableau est bien chargé
let intervalId = setInterval(() => {
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');
    if (tableau) {
        clearInterval(intervalId);
        console.log('Tableau trouvé, démarrage de l\'observation.');
        observerTableau();
    } else {
        console.log('Tableau non encore chargé, réessayer...');
    }
}, 1000);

let intervalId2 = setInterval(() => {
    console.log("Assignations:", assignations);
    let tableau = document.querySelector('[data-testid="table-scroll-container"]');

    if (tableau) {
        verifierTousLesLiens();
    }
    mettreAJourTexteBouton();
}, 2000);

// Fonction pour calculer les totaux des colonnes par assigné
function calculerTotauxParAssigne() {
    let totaux = {};

    // Parcourir toutes les lignes capturées
    for (let titre in assignations) {
        let tache = assignations[titre];

        // Pour chaque tâche, ajouter les valeurs par colonne aux assignés correspondants
        tache.assignees.forEach(assignee => {
            if (!totaux[assignee]) {
                totaux[assignee] = {};
            }

            // Ajouter les sommes pour chaque colonne (par exemple, "Hrs spent")
            for (let colonne in tache.sommesColonnes) {
                if (!totaux[assignee][colonne]) {
                    totaux[assignee][colonne] = 0;
                }
                totaux[assignee][colonne] += tache.sommesColonnes[colonne];
            }
        });
    }

    return totaux;
}

// Insérer le bouton et la modal dans le document
const modalHTML = `
    <style>
        /* Styles pour le bouton fixe */
        #openModalBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        }

        /* Styles pour la modal */
        .modal {
            display: none;
            position: fixed;
            z-index: 1001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            justify-content: center;
            align-items: center;
        }

        .modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            width: 80%;
            max-width: 80%;
            text-align: left;
        }

        /* Bouton pour fermer la modal */
        .close-btn {
            background-color: red;
            color: white;
            padding: 5px 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            float: right;
        }
    </style>

    <!-- Bouton en position fixe -->
    <button id="openModalBtn">Voir Totaux</button>

    <!-- Modal pour afficher les totaux -->
    <div id="totauxModal" class="modal">
        <div class="modal-content">
            <button class="close-btn" id="closeModalBtn">Fermer</button>
            <h3>Totaux par assigné</h3>
            <div id="modalContent">
                <!-- Les totaux seront insérés ici -->
            </div>
        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

// Fonction pour afficher les totaux dans un tableau dans la modal
function afficherTotauxDansModal() {
    let totaux = calculerTotauxParAssigne();
    let modalContent = document.getElementById('modalContent');

    // Créer un ensemble unique de toutes les colonnes rencontrées
    let colonnes = new Set();

    // Parcourir les totaux pour collecter tous les types de colonnes
    for (let assignee in totaux) {
        for (let colonne in totaux[assignee]) {
            colonnes.add(colonne);
        }
    }

    // Créer le tableau HTML pour afficher les totaux par assigné et par colonne
    let tableauHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr>
                    <th style="padding: 8px; border-bottom: 2px solid #ddd;">Assigné</th>
    `;

    // Ajouter les colonnes dynamiquement dans le tableau
    colonnes.forEach(colonne => {
        tableauHTML += `<th style="padding: 8px; border-bottom: 2px solid #ddd;">${colonne}</th>`;
    });

    tableauHTML += `
                </tr>
            </thead>
            <tbody>
    `;

    // Ajouter chaque assigné et ses valeurs par colonne dans le tableau
    for (let assignee in totaux) {
        tableauHTML += `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">${assignee}</td>`;

        // Ajouter les valeurs pour chaque colonne, en mettant "0" si aucune valeur n'existe
        colonnes.forEach(colonne => {
            let valeur = totaux[assignee][colonne] || 0;
            tableauHTML += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${valeur}</td>`;
        });

        tableauHTML += `</tr>`;
    }

    // Fermer le tableau
    tableauHTML += `
            </tbody>
        </table>
    `;

    // Si aucun assigné n'est trouvé, afficher un message
    if (Object.keys(totaux).length === 0) {
        tableauHTML = '<p>Aucun assigné trouvé.</p>';
    }

    // Insérer le tableau dans la modal
    modalContent.innerHTML = tableauHTML;

    // Mettre à jour le texte du bouton avec le nombre de tickets capturés et total
    mettreAJourTexteBouton();
}

// Fonction pour mettre à jour le texte du bouton avec le nombre de tickets
function mettreAJourTexteBouton() {
    let nombreDeTicketsCaptures = Object.keys(assignations).length;
    let nombreTotalDeTickets = getTotalTicketsFromDOM();
    let bouton = document.getElementById('openModalBtn');

    // Mettre à jour le texte du bouton
    bouton.innerText = `Voir Totaux (${nombreDeTicketsCaptures}/${nombreTotalDeTickets})`;
}

function fermerModal() {
    document.getElementById('totauxModal').style.display = 'none';
}

// Gérer l'ouverture et la fermeture de la modal
document.getElementById('openModalBtn').addEventListener('click', () => {
    document.getElementById('totauxModal').style.display = 'flex';  // Afficher la modal
    afficherTotauxDansModal();  // Afficher les résultats dans la modal
});

document.getElementById('closeModalBtn').addEventListener('click', fermerModal);

// Fermer la modal en cliquant en dehors de la boîte de contenu
window.addEventListener('click', (event) => {
    let modal = document.getElementById('totauxModal');
    if (event.target === modal) {
        fermerModal();
    }
});

// Écouter l'événement 'keydown' pour fermer la modal avec la touche ESC
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {  // Vérifier si la touche est 'ESC'
        let modal = document.getElementById('totauxModal');
        if (modal.style.display === 'flex') {
            fermerModal();
        }
    }
});

// Fonction pour récupérer le nombre total de tickets à partir du DOM
function getTotalTicketsFromDOM() {
    // Chercher l'élément contenant le nombre total de tickets
    let totalTicketsElement = document.querySelector('span[data-testid="filter-results-count"]');

    // Si l'élément existe, récupérer le texte et le convertir en nombre
    console.log(totalTicketsElement);
    if (totalTicketsElement) {
        return parseInt(totalTicketsElement.textContent.trim(), 10);
    }
    return 0;  // Retourner 0 si l'élément n'est pas trouvé
}

// Fonction pour afficher les totaux de manière lisible
function afficherTotauxParAssigne() {
    console.log("Assignations:", assignations);
}
