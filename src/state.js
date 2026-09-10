// État global du module. Vit en mémoire uniquement : ni localStorage, ni sessionStorage,
// ni cookie, ni query string (contrainte DPIA n°3). Un refresh remet tout à zéro.
export const initialState = Object.freeze({
  step: 1,            // 1 | 2 | 3
  country: null,      // code ISO alpha-2 ou null = tous les pays
  query: '',
  selectedMep: null,  // objet député, ou { bulk: true, country: 'BE' }
  template: null,     // 0 | 1 | 2
  subject: '',
  body: '',
});

export const state = { ...initialState };

export function reset() {
  Object.assign(state, initialState);
}
