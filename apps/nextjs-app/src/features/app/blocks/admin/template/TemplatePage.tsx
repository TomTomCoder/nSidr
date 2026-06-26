'use client';

import { useTranslation } from 'next-i18next';
import { AdminHelpPanel } from '../shared/AdminHelpPanel';
import { TemplateTable } from './components';

const STEPS = [
  {
    title: "Créer l'entrée de modèle",
    body: 'Depuis les paramètres d\'une base, cliquez sur "Publier en modèle". Une nouvelle ligne apparaît ici, liée à cette base.',
  },
  {
    title: 'Remplir les métadonnées',
    body: 'Complétez le Nom (obligatoire), la Description courte (obligatoire), une image de couverture et une Description Markdown pour la documentation détaillée. Assignez une ou plusieurs Catégories.',
  },
  {
    title: 'Prendre un snapshot',
    body: "Cliquez sur l'icône ⚙ dans la colonne \"Snapshot\". Cela capture l'état actuel de la base (tables, champs, vues, données). C'est ce snapshot que les utilisateurs copieront. Vous pouvez le rafraîchir à tout moment.",
  },
  {
    title: 'Publier',
    body: 'Activez le toggle "Statut". Prérequis : nom + description + snapshot présents. Une fois publié, le modèle apparaît dans la galerie accessible à tous les utilisateurs de l\'instance.',
  },
  {
    title: 'Mettre en avant (optionnel)',
    body: 'Activez le toggle "Mis en avant" pour afficher le modèle en tête de galerie. Uniquement disponible si le modèle est déjà publié.',
  },
];

const TIPS = [
  { icon: '↕', text: 'Glissez-déposez les lignes pour réordonner les modèles dans la galerie.' },
  {
    icon: '📌',
    text: 'Menu ⋯ → "Épingler en tête" remonte instantanément le modèle en première position.',
  },
  {
    icon: '🔗',
    text: 'Le bouton de lien ouvre un aperçu de la base source dans un nouvel onglet.',
  },
  {
    icon: '📊',
    text: 'La colonne Utilisation/Vis affiche le nombre de fois où le modèle a été utilisé (copié) vs simplement consulté.',
  },
  {
    icon: '🗂',
    text: "Gérez les catégories via l'icône ⚙ dans l'en-tête de la colonne Catégorie (créer, renommer, réordonner, supprimer).",
  },
];

export const TemplatePage = () => {
  const { t } = useTranslation('common');
  return (
    <div className="flex size-full flex-col overflow-auto px-8 py-6">
      <div className="flex items-center justify-between p-2">
        <div className="text-2xl font-semibold">{t('settings.templateAdmin.title')}</div>
      </div>

      <AdminHelpPanel
        intro={
          <p>
            Cette page permet de gérer la <strong>galerie de modèles</strong> de l&apos;instance.
            Les modèles sont des bases pré-configurées (tables, champs, vues) que les utilisateurs
            peuvent copier en un clic pour démarrer rapidement — CRM, ERP, RH, gestion de projets,
            etc.
          </p>
        }
        steps={STEPS}
        stepsTitle="Workflow de publication"
        tips={TIPS}
      />

      <div className="flex-1 overflow-y-auto">
        <TemplateTable />
      </div>
    </div>
  );
};
