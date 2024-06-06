import { SpotifyApi, AuthorizationCodeWithPKCEStrategy, SimplifiedPlaylist, Track, MaxInt } from "@spotify/web-api-ts-sdk";

// spotify init
const redirectURL = window.location.origin + "/callback";
const implicitGrantStrategy = new AuthorizationCodeWithPKCEStrategy(
    "2450b38b0c0744948cf541349f2a5d15",
    redirectURL,
    ['user-top-read', 'playlist-modify-public', 'playlist-read-private', 'playlist-modify-private', 'user-read-email']
);
const spotify = new SpotifyApi(implicitGrantStrategy);
let userId: string | null = null;

if (await spotify.getAccessToken() === null) {
    await spotify.authenticate()
}

spotify.currentUser.profile().then((profile) => {
    userId = profile.id;
    document.getElementById("displayName")!.innerText = `logged in as ${profile.display_name}`;
})

function updateSongListUI(songs: Track[],name:string) {
    songsList!.innerHTML = `<p>${name}</p>`;
    songs.forEach((song) => {
        const allArtists = song.artists.reduce((acc, artist, idx) => { return (idx > 0 ? acc += `, ${artist.name}` : artist.name) }, '');
        songsList!.innerHTML += `<li>${allArtists} - ${song.name}</li>`;
    })
}

const windowURL = new URL(window.location.href);
// dom stuff
const songsList = document.getElementById('songsList');
const result = document.getElementById('result');
const plBtn = document.getElementById('createPlaylistBtn');

const limitp = windowURL.searchParams.get("limit")
let limit: MaxInt<50> = 50;

if (limitp !== null) {
    if (Number.parseInt(limitp) > 50 || Number.parseInt(limitp) < 1) limit = 50; // invalid limit 
    else limit = Number.parseInt(limitp) as MaxInt<50>;
}

let topSongs = await spotify.currentUser.topItems("tracks", "short_term", limit) // default to short term
plBtn!.onclick = () => createPlaylist(topSongs.items, `My Top ${limit} Songs - Short Term`);
switch (windowURL.pathname) {
    case "/callback":
        window.location.href = window.location.origin;
    case "/":
    case "/short":
        updateSongListUI(topSongs.items,`My Top ${limit} Songs - Short Term`);
        break;
    case "/medium":
        topSongs = await spotify.currentUser.topItems("tracks", "medium_term", limit)
        plBtn!.onclick = () => createPlaylist(topSongs.items, `My Top ${limit} Songs - Medium Term`);
        updateSongListUI(topSongs.items,`My Top ${limit} Songs - Medium Term`);
        break;
    case "/long":
        topSongs = await spotify.currentUser.topItems("tracks", "long_term", limit)
        plBtn!.onclick = () => createPlaylist(topSongs.items, `My Top ${limit} Songs - Long Term`);
        updateSongListUI(topSongs.items,`My Top ${limit} Songs - Long Term`);
        break;
    default:
        console.log('default', windowURL.pathname);
}


async function getAllUserPlaylists() {
    const total = new Array<SimplifiedPlaylist>();
    let temp = await spotify.currentUser.playlists.playlists();
    let offset = 0;
    while (temp.next != null) {
        offset += 50
        total.push(...temp.items.filter((playlist) => { return playlist.owner.id == userId }));
        temp = await spotify.currentUser.playlists.playlists(50, offset);
    }
    return total;
}

async function existsPlaylist(name: string) {
    let temp = await spotify.currentUser.playlists.playlists();
    let offset = 0;
    while (temp.next != null) {
        offset += 50
        const findRes = temp.items.find((playlist) => { return playlist.name == name });
        if (findRes !== undefined) {
            return findRes;
        }
        temp = await spotify.currentUser.playlists.playlists(50, offset);
    }
    return null;
}

export async function createPlaylist(songs: Track[], name: string) {
    document.getElementById("result")!.innerHTML = "Creating..."
    try {
        if (userId === null) throw new Error("userid is null");
        let topPlaylist = await existsPlaylist(name);
        if (topPlaylist === null) {

            topPlaylist = await spotify.playlists.createPlaylist(userId, { name: name, public: false });
        }
        if (topPlaylist !== null) {
            await spotify.playlists.updatePlaylistItems(topPlaylist.id, { uris: songs.reduce((acc, curr) => { acc.push(curr.uri); return acc; }, new Array<string>()) })
        }
        else {
            console.error("playlist is undefined");
            result!.innerText = "error creating playlist: playlist is undefined";
            return;
        }
    } catch (e) {
        console.error(e);
        result!.innerText = `error creating playlist: ${e}`;
        return;
    }
    result!.innerText = `playlist created successfully: ${name}`;
}


function logout() {
    spotify.logOut();
    localStorage.clear();
    window.location.reload();
}

document.getElementById("logoutBtn")!.onclick = logout;