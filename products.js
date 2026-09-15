// ===== CATALOGUE (partagé par le site et l'espace admin) =====
// Pour changer un produit ou un prix, c'est ici.
// unit 'kg'    : prix au kilo + choix du poids (en grammes)
// unit 'piece' : prix fixe à la pièce
const CATEGORIES = { boeuf: 'Bœuf', agneau: 'Agneau', porc: 'Porc', volaille: 'Volaille', colis: 'Colis & apéro' };

const PRODUCTS = [
  { id: 'entrecote', cat: 'boeuf', name: 'Entrecôte maturée', desc: 'Persillée et fondante, maturée 21 jours sur os.', img: '1603048297172-c92544798d5a', unit: 'kg', price: 36.9, weights: [300, 600, 1000] },
  { id: 'cote-boeuf', cat: 'boeuf', name: 'Côte de bœuf', desc: 'Maturée 28 jours, idéale au barbecue ou à la plancha.', img: '1615937657715-bc7b4b7962c1', unit: 'kg', price: 39.9, weights: [1000, 1200, 1500] },
  { id: 'faux-filet', cat: 'boeuf', name: 'Faux-filet', desc: 'Tendre et savoureux, bordé de son gras nacré.', img: '1560781290-7dc94c0f8f4f', unit: 'kg', price: 32.5, weights: [300, 600, 1000] },
  { id: 'cotelettes-agneau', cat: 'agneau', name: "Côtelettes d'agneau", desc: 'Agneau fermier, à saisir quelques minutes par face.', img: '1602470520998-f4a52199a3d6', unit: 'kg', price: 34, weights: [400, 800, 1200] },
  { id: 'cotes-porc', cat: 'porc', name: 'Côtes de porc fermier', desc: 'Porc élevé sur paille, chair rosée et juteuse.', img: '1628268909376-e8c44bb3153f', unit: 'kg', price: 14.9, weights: [500, 1000, 1500] },
  { id: 'travers', cat: 'porc', name: 'Travers marinés', desc: 'Marinade maison miel et épices, prêts à griller.', img: '1544025162-d76694265947', unit: 'kg', price: 13.5, weights: [500, 1000, 1500] },
  { id: 'poulet', cat: 'volaille', name: 'Poulet fermier', desc: 'Label Rouge, élevé en plein air 81 jours minimum.', img: '1598103442097-8b74394b95c6', unit: 'piece', price: 18.9, info: 'Environ 1,8 kg' },
  { id: 'plateau-apero', cat: 'colis', name: 'Plateau charcuterie', desc: 'Jambon sec, saucissons, terrine maison et condiments.', img: '1541529086526-db283c563270', unit: 'piece', price: 29, info: 'Pour 4 à 6 personnes' },
  { id: 'colis-bbq', cat: 'colis', name: 'Colis barbecue', desc: 'Saucisses, merguez, bavette, travers et côtes d\'agneau.', img: '1607623814075-e51df1bdc82f', unit: 'piece', price: 59, info: 'Environ 2,5 kg · 6 personnes' }
];
