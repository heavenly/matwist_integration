// ==UserScript==
// @name        MAL & TWIST integration
// @version     1.0
// @author      moneysake
// @description started / created at 3/31/20
// @grant        GM_getValue
// @grant        GM_setValue
// @match *://myanimelist.net/*
// @match *://twist.moe/*
// ==/UserScript==

/*
 * Some information
 * - anime_name_id = stores the anime_name's myanimelist id
 * - anime_name = stores the anime_name's current episode
 * - keystore = stores a list of keys -> names of animes that haven't been updated
 * */
function get_keystore() {
    var keystore_values_str = GM_getValue("anime_keystore");
    if (keystore_values_str == null || keystore_values_str == undefined) {
        return keystore_values_str;
    }
    var keystore_values = keystore_values_str.split("|");
    return keystore_values;
}

function append_to_keystore(anime_name) {
    var keystore_stored_val = GM_getValue("anime_keystore");
    if (keystore_stored_val == undefined) {
        GM_setValue("anime_keystore", anime_name);
        return;
    }
    if (keystore_stored_val.length > 0) {
        var keystore_values = keystore_stored_val.split("|");
        if (anime_name in keystore_values) {
            console.log("anime already prepared for MAL update")
            return;
        }
        GM_setValue("anime_keystore", keystore_stored_val + "|" + anime_name);
    } else {
        GM_setValue("anime_keystore", anime_name);
    }
}

function clear_keystore() {
    GM_setValue("anime_keystore", "")
}

function is_null_undef(variable) {
    return (variable == null || variable == undefined);
}

function per_site_basis() {
    if (window.location.href.includes("myanimelist.net")) {
        csrf_token_element = document.getElementsByName("csrf_token")[0]; //updating csrf_token

        if (is_null_undef(csrf_token_element))
            return;

        GM_setValue("mal_csrf_token", csrf_token_element.content);
        console.log("updated csrf token");

        var keystore = get_keystore();

        if (is_null_undef(keystore) || keystore.length == 0) {
            console.log("keystore is empty/null/undefined - no anime to update");
            return;
        }

        keystore.forEach(function(item, index) {
            if (is_null_undef(item)) {
                return;
            }
            var episode_number = GM_getValue(item);
            var anime_id = GM_getValue(item + "_id");
            if (is_null_undef(episode_number) || is_null_undef(anime_id)) {
                return;
            }
            send_post_update_episodes(anime_id, episode_number);
            console.log("updated viewing progress for " + item + "(" + anime_id + ") to episode " + episode_number);
        });
        clear_keystore();

    } else if (window.location.href.includes("twist.moe")) {
        var local_anime_data = new match_anime_name_and_ep();

        if (is_null_undef(local_anime_data) || local_anime_data.anime_name == "ERROR PARSING NAME") {
            //not on an actual anime page
            return;
        }

        var myanimelist_id = get_current_page_mal_id();
        var current_episode = local_anime_data.anime_episode;

        if (is_null_undef(myanimelist_id)) {
            return;
        }

        GM_setValue(local_anime_data.anime_name, current_episode);
        append_to_keystore(local_anime_data.anime_name);
        console.log("updated viewing progress. logon to MAL")
    }
}

function set_current_anime_id(id) {
    var local_anime_data = new match_anime_name_and_ep();
    GM_setValue(local_anime_data.anime_name + "_id", id);
}

function create_user_functions() {
    unsafeWindow.set_current_anime_id = set_current_anime_id;
}

function match_anime_name_and_ep() {
    var current_url = window.location.href;
    var regex_fn = /https:\/\/twist.moe\/a\/(.*)\/(\d+)/; //https://regex101.com/r/xRsH4u/1/
    var matches = current_url.match(regex_fn);

    if (is_null_undef(matches)) {
        this.anime_name = "ERROR PARSING NAME";
        return;
    }

    matches.splice(0, 1); //remove the current_url match  
    this.anime_name = matches[0];
    this.anime_episode = parseInt(matches[1]);
}

function get_current_page_mal_id() {
    var local_anime_data = new match_anime_name_and_ep();

    if (is_null_undef(local_anime_data) || local_anime_data.anime_name == "ERROR PARSING NAME")
        return null;

    var anime_id = GM_getValue(local_anime_data.anime_name + "_id");
    if (is_null_undef(anime_id)) {
        //alert("anime id is null, open console for details");
        var user_response = parseInt(prompt("enter this anime's MAL id"));
        if (is_null_undef(user_response) || isNaN(user_response)) {
            console.clear();
            console.log("use set_current_anime_id(myanimelist anime's id) to setup id for this page, or insert something normal into the textbox (by refreshing the page)");
            return null;
        }
        set_current_anime_id(user_response);
        location.reload(); //lazy fix to save the current episode properly
    }
    return anime_id;
}

function send_post_update_episodes(id, episode) {
    var csrf_token = GM_getValue("mal_csrf_token");
    var settings = {
        "url": "https://myanimelist.net/ownlist/anime/edit.json",
        "method": "POST",
        "timeout": 0,
        "data": "{\"anime_id\":" + id + ",\"status\":1,\"score\":0,\"num_watched_episodes\":" + episode + ",\"csrf_token\":\"" + csrf_token + "\"}",
    };

    $.ajax(settings).done(function(response) {
        console.log(response);
    });
}

per_site_basis();
create_user_functions();
