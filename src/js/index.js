import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from './views/base';

// ********** GLOBALNY STATUS APLIKACJI **********
// * - Obiekt search
// * - Obiekt aktualnego przepisu
// * - Obiekt shopping listy
// * - Polubione przepisy

const state = {};

// ********** KONTROLLER SZUKANIA DANYCH **********

const controlSearch = async () => {
    // 1. Przechwycić zapytanie z widoku
    const query = searchView.getInput();

    if (query) {
        //2. Stworzyć nowy obiekt i dodać go do obecnego stanu
        state.search = new Search(query);

        //3. Przygotować UI na rezultat
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try {
            //4. Szukać przepisów 
            await state.search.getResults();

            //5. Zrenderować rezultaty w UI
            clearLoader();
            searchView.renderResults(state.search.result);
        } catch (err) {
            alert('Something wrong with the search...');
            clearLoader();
        }
    }
}

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});


elements.searchResPages.addEventListener('click', e => {
    // Ustawienie nasłuchiwania na cały przycisk
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});


// ********** KONTROLLER PRZEPISÓW **********

const controlRecipe = async () => {
    //1. Pobieranie ID z URL
    const id = window.location.hash.replace('#', '');

    if (id) {
        //2. Przygotowanie UI na zmiany
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        //3. Zaznaczenie aktywnego przepisu w panelu
        if (state.search) searchView.highlightSelected(id);

        //4. Stwórz nowy obiekt Recipe
        state.recipe = new Recipe(id);

        try {
            //5. Pobierz dane przepisu i przekonwertuje składniki
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            //6. Określ servingsy i czas przygotowania
            state.recipe.calcTime();
            state.recipe.calcServings();

            //7. Zrenderuj przepis
            clearLoader();
            recipeView.renderRecipe(
                state.recipe,
                state.likes.isLiked(id)
            );

        } catch (err) {
            console.log(err);
            alert('Error processing recipe!');
        }
    }
};


['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));


// ********* KONTROLER LISTY *********

const controlList = () => {
    // Stwórz nową listę jeśli jeszcze jej nie było
    if (!state.list) state.list = new List();

    // Dodaj każdy składnik do listy i do UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
}

// Obsługa przycisków
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // obsługa przycisku "usuń"
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        // przycisk "usuń" z bazy danych
        state.list.deleteItem(id);

        // przycisk "usuń" z UI
        listView.deleteItem(id);

        // Zaktualizowanie ilości
    } else if (e.target.matches('.shopping__count-value')) {
        const val = parseFloat(e.target.value, 10);
        state.list.updateCount(id, val);
    }
});


// ********* KOTROLER LIKÓW *********

const controlLike = () => {
    if (!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id;

    // Użytkownik nie polikował jeszcze aktualnego przepisu
    if (!state.likes.isLiked(currentID)) {
        // Dodaj "like" do statusu
        const newLike = state.likes.addLike(
            currentID,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img
        );
        // Toggle przycisku "like"
        likesView.toggleLikeBtn(true);

        // Dodanie "like" do UI
        likesView.renderLike(newLike);

        // Użytkownik polikował już przepis 
    } else {
        // Usuń "like" ze statusu
        state.likes.deleteLike(currentID);

        // Toggle przycisku "like"
        likesView.toggleLikeBtn(false);

        // Usunięcie "like" z UI
        likesView.deleteLike(currentID);
    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Odzyskanie polikowanych przepisów przy przeładowaniu strony
window.addEventListener('load', () => {
    state.likes = new Likes();

    // Odzyskanie lików
    state.likes.readStorage();

    // Toggle przycisków do likowania w menu
    likesView.toggleLikeMenu(state.likes.getNumLikes());

    // Renderowanie istniejących polikowanych przepisów
    state.likes.likes.forEach(like => likesView.renderLike(like));
});


// Handling recipe button clicks
elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button is clicked
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    } else if (e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase button is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if (e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        // Add ingredients to shopping list
        controlList();
    } else if (e.target.matches('.recipe__love, .recipe__love *')) {
        // Like controller
        controlLike();
    }
});
