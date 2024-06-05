import { SpotifyApi, AuthorizationCodeWithPKCEStrategy, SimplifiedPlaylist } from "@spotify/web-api-ts-sdk";

const redirectURL = window.location.origin + "/callback";

const implicitGrantStrategy = new AuthorizationCodeWithPKCEStrategy(
    "2450b38b0c0744948cf541349f2a5d15",
    redirectURL,
    ['user-top-read', 'playlist-modify-public', 'playlist-read-private', 'playlist-modify-private', 'user-read-private', 'user-read-email']
);

const spotify = new SpotifyApi(implicitGrantStrategy);
const profile = await spotify.currentUser.profile();
const userId = profile.id;

document.getElementById("displayName")!.innerText = profile.display_name;
const topsongs = await spotify.currentUser.topItems("tracks", "short_term", 50)

const songsList = document.getElementById('songsList');
songsList!.innerHTML = "";
topsongs.items.forEach((song) => {
    const allArtists = song.artists.reduce((acc, artist) => { return acc += `, ${artist.name}` }, '');
    songsList!.innerHTML += `<li>${allArtists} - ${song.name}</li>`;
})

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

async function findTopPlaylist() {
    let temp = await spotify.currentUser.playlists.playlists();
    let offset = 0;
    while (temp.next != null) {
        offset += 50
        const findRes = temp.items.find((playlist) => { return playlist.name == "My Top 50 Songs - Short Term" });
        if (findRes !== undefined) {
            return findRes;
        }
        temp = await spotify.currentUser.playlists.playlists(50, offset);
    }
    return null;
}

export async function createPlaylist() {
    document.getElementById("result")!.innerHTML = "Creating..."
    let topPlaylist = await findTopPlaylist();
    if (topPlaylist === null) {
        topPlaylist = await spotify.playlists.createPlaylist(userId, { name: "My Top 50 Songs - Short Term", public: false });
    }
    if (topPlaylist !== null) {
        await spotify.playlists.updatePlaylistItems(topPlaylist.id, { uris: topsongs.items.reduce((acc, curr) => { acc.push(curr.uri); return acc; }, new Array<string>()) })
    }
    else {
        console.error("Playlist is undefined");
        document.getElementById("result")!.innerText = "Failed, check console";
        return;
    }
    document.getElementById("result")!.innerText = "Playlist created successfully: My Top 50 Songs - Short Term";
}
document.getElementById("createPlaylistBtn")!.onclick = createPlaylist