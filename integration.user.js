// ==UserScript==
// @name        MAL & TWIST integration
// @version     1.0
// @author      moneysake
// @description 3/31/2020, 4:51:47 PM
// @grant        GM_getValue
// @grant        GM_setValue
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
        GM_setValue("anime_keystore", keystore_stored_val + "|" + anime_name);
    } else {
        GM_setValue("anime_keystore", anime_name);
    }
}

function clear_keystore() {
    GM_setValue("anime_keystore", "")
}

function per_site_basis() {
    if (window.location.href.includes("myanimelist.net")) {
        csrf_token_element = document.getElementsByName("csrf_token")[0]; //updating csrf_token
      
        if (csrf_token_element == null || csrf_token_element == undefined)
            return;
      
        GM_setValue("mal_csrf_token", csrf_token_element.content);
        console.log("updated csrf token");
        
        var keystore = get_keystore();
      
        if (keystore == null || keystore == undefined || keystore.length == 0) {
            console.log("keystore is empty/null/undefined - no anime to update");
            return;
        }
      
        keystore.forEach(function(item, index) {
            var episode_number = GM_getValue(item);
            var anime_id = GM_getValue(item + "_id");
            send_post_update_episodes(anime_id, episode_number);
            console.log("updated viewing progress for " + item + "(" + anime_id + ") to episode " + episode_number);
        });
        clear_keystore();
        
    } else if (window.location.href.includes("twist.moe")) {
        var local_anime_data = new match_anime_name_and_ep();
        
        if (local_anime_data == null || local_anime_data == undefined || local_anime_data.anime_name == "ERROR PARSING NAME") {
            console.log("data is undefined / null - possibly not an episode page?");
            return;
        }
      
        var myanimelist_id = get_current_page_mal_id();
        var current_episode = local_anime_data.anime_episode;
      
        if (myanimelist_id == null || myanimelist_id == undefined)
            return;
      
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
  
    if (matches == null) {
        this.anime_name = "ERROR PARSING NAME";
        return;
    }
  
    matches.splice(0, 1); //remove the current_url match  
    this.anime_name = matches[0];
    this.anime_episode = parseInt(matches[1]);
}

function get_current_page_mal_id() {
    var local_anime_data = new match_anime_name_and_ep();
    
    if (local_anime_data == null || local_anime_data == undefined || local_anime_data.anime_name == "ERROR PARSING NAME")
        return;
  
    var anime_id = GM_getValue(local_anime_data.anime_name + "_id");
    if (anime_id == null || anime_id == undefined) {
        //alert("anime id is null, open console for details");
        var user_response = parseInt(prompt("enter this anime's MAL id"));
        if (user_response == null || user_response == undefined || isNaN(user_response)) {
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
    "headers": {
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": ["application/x-www-form-urlencoded; charset=UTF-8", "text/plain"],
      "X-Requested-With": "XMLHttpRequest",
      "Origin": "https://myanimelist.net",
      "Connection": "keep-alive",
    },
    "data": "{\"anime_id\":" + id + ",\"status\":1,\"score\":0,\"num_watched_episodes\":" + episode + ",\"csrf_token\":\"" + csrf_token + "\"}",
  };

  $.ajax(settings).done(function (response) {
    console.log(response);
  });
}

per_site_basis();
create_user_functions();
