const swiper = new Swiper('.swiper', {
    // Optional parameters
    direction: 'vertical',
    loop: false,
  
    // If we need pagination
    pagination: {
      el: '.swiper-pagination',
    },
  
    // Navigation arrows
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  
    // And if we need scrollbar
    scrollbar: {
      el: '.swiper-scrollbar',
    },
  });


swiper.on('slideChangeTransitionStart', async function () {
  let lastSlideIndex = swiper.previousIndex; // Index of slide that is currently active
  let lastSlide = swiper.slides[lastSlideIndex]; // Get the current slide
  let lastIframe = lastSlide.querySelector('.yt_player'); // Find the YouTube player in the current slide

  if (lastIframe) {
    lastIframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  }

  let activeSlide = swiper.slides[swiper.activeIndex];
    let activeIframe = activeSlide.querySelector('.yt_player');
    if (activeIframe && activeIframe.contentWindow) {
        activeIframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
  // start();
});

class VideoData {
  constructor(songName, spotifySongId, spotifyArtistsObj, spotifyGenre) {
      this.songName = songName;
      this.spotifySongId = spotifySongId;
      this.spotifyArtistsObj = spotifyArtistsObj;
      this.spotifyGenre = spotifyGenre;
      this.watchTime = 0;
      this.opinion = 0;
  }

  updateWatchTime(newTime) {
      this.watchTime += newTime;
  }

  updateOpinion(newOpinion) {
      this.opinion = newOpinion;
  }
}

function loadClient() {
  gapi.client.setApiKey("AIzaSyDxXfbbJRF_Ntu9zReVK1bcZ7LNiOH-9K0"); // Music Swipe API
  // gapi.client.setApiKey("AIzaSyCQEU37aU2xl3X0WeijqS7RDqjHEkAdcvM"); // Music Swipe 2 API
  // gapi.client.setApiKey("AIzaSyBrdsRTrb9Gxh4TG3HVR3RnffYIegPIhUY"); // Music Swipe 3 API

  return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
      .then(function() { console.log("GAPI client loaded for API"); },
            function(err) { console.error("Error loading GAPI client for API", err); });
            
}

const SpotifyAPI = (function() {
  // const clientId = 'f15e198dba434061abcfae185f303592'; 
  // const clientSecret = '41c7f09497da4b8a9291909b0e48e3ba';
  const clientId = '3e428ecf7b6d47e09ef48f3924faa9bf'; //Music Swipe 2
  const clientSecret = 'c1f61168eac74081aa961231436c1a09'; //Music Swipe 2
  var access_token;
  var refresh_token;
  var playlist_id;

  // Spotify OAuth configuration
  const redirectUri = 'https://teediddydizzle.github.io/MusicSwipe/MusicSwipe.html'; // Must match the one set in the Spotify dashboard
  // const redirectUri = 'http://localhost:5500/MusicSwipe/MusicSwipe.html'; // Must match the one set in the Spotify dashboard
  const scopes = 'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public'; // Space-separated list of scopes


  // Attach event listener to login button
  document.getElementById('spotify-login-btn').addEventListener('click', async function() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&show_dialog=true`;
    window.location.href = authUrl;
  });

  const _refreshAccessToken = async (refreshToken) => {
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`
    });
  
    const data = await result.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in
    };
  }

  // Exchange the authorization code for an access token
 const _fetchAccessToken = async (code) => {
    const tokenUrl = 'https://accounts.spotify.com/api/token';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();
    return data.access_token;
  }

  const _getUserId = async (accessToken) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      const data = await response.json();
      return data.id; // This is the user's Spotify ID
    } catch (error) {
      console.error('Error fetching user ID:', error);
      throw error;
    }
  }

  const _createPlaylist = async (accessToken, playlistName) => {
    try {
      const userId = await _getUserId(accessToken);
      console.log(userId)
      const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlistName,
          description: `${userId}'s playlist from MusicSwipe`, // You can customize this
          public: false // Set to true if you want the playlist to be public
        })
      });
      const data = await response.json();
      const tempPlaylistId = await data.id;
      playlist_id = tempPlaylistId;
      console.log(playlist_id);
      return data; // This is the newly created playlist object
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  const _addSongsToPlaylist = async (token, playlistId, songs) => {
    const uris = songs.map(song => song.track.uri); // Assuming each song object has a uri property
    
    console.log("Adding Songs");
    console.log(uris);
    const result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: uris })
    });

    if (!result.ok) {
      throw new Error(`HTTP error! status: ${result.status}`);
    }

    return await result.json();
  }

  const _getToken = async () => {
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Authorization' : 'Basic ' + btoa(clientId + ':' + clientSecret)
      },
      body: 'grant_type=client_credentials'
    });

    const data = await result.json();
    return data.access_token;
  }

  const _getCategories = async (token) => {

    const result = await fetch(`https://api.spotify.com/v1/browse/categories?locale=sv_US&limit=10`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });
    const data = await result.json();
    return data.categories.items;
  }

  const _getPlaylistByGenre = async (token, genreId) => {

    const limit = 10;
    
    const result = await fetch(`https://api.spotify.com/v1/browse/categories/${genreId}/playlists?limit=${limit}`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });

    const data = await result.json();
    return data.playlists.items;
  }

  const _getTracks = async (token, tracksEndPoint, offset = 0) => {
    const limit = 100;
    const result = await fetch(`${tracksEndPoint}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });

    const data = await result.json();
    return data.items;
  }

  const _getTrack = async (token, trackEndPoint) => {

    const result = await fetch(`${trackEndPoint}`, {
        method: 'GET',
        headers: { 'Authorization' : 'Bearer ' + token}
    });

    const data = await result.json();
    return data;
  }

  const _getArtistGenres = async (token, artistId) => {
    const result = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await result.json();
    return data.genres; // Assuming the API returns an array of genres
  }

  const _getRecommendations = async (token, numberOfTracks, seedObj, trackAttributes) => {
    
    console.log("Recommendation Seed Objects:", seedObj);

    
    const queryParams = new URLSearchParams({
      limit: numberOfTracks, 
      market: 'US', 
      seed_tracks: seedObj.seed_tracks.join(','), 
      seed_artists: seedObj.seed_artists.join(','), 
      seed_genres: seedObj.seed_genres.join(','), 
    });

    if (trackAttributes && Object.keys(trackAttributes).length > 0) {
      // Add track attributes to the query parameters if any additional attributes are passed.
      for (const [key, value] of Object.entries(trackAttributes)) {
        queryParams.append(key, value);
      }
    }

    const result = await fetch(`https://api.spotify.com/v1/recommendations?${queryParams}`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await result.json();
    // await console.log(data);
    return data.tracks;
  }

  return {
    getUserId: (accessToken) => _getUserId(accessToken),
    createPlaylist: (accessToken, playlistName) => _createPlaylist(accessToken, playlistName),
    addSongsToPlaylist: (token, playlistId, songs) => _addSongsToPlaylist(token, playlistId, songs),
    refreshAccessToken: (refreshToken) => _refreshAccessToken(refreshToken),
    fetchAccessToken: (code) => _fetchAccessToken(code),
    getToken: () => _getToken(),
    getCategories: (token) => _getCategories(token),
    getPlaylistByGenre: (token, genreId) => _getPlaylistByGenre(token, genreId),
    getTracks: (token, tracksEndPoint, offset) => _getTracks(token, tracksEndPoint, offset),
    getTrack: (token, trackEndPoint) => _getTrack(token, trackEndPoint),
    getArtistGenres: (token, artistId) => _getArtistGenres(token, artistId),
    getRecommendations: (token, numberOfTracks, seedObj, trackAttributes) => _getRecommendations(token, numberOfTracks, seedObj, trackAttributes),
    access_token,
    refresh_token,
    playlist_id,
  };

})();

let selectedTrackIds = [];
var spotifyPlaylistId;

async function generateSpotifyPlaylist() {
  document.getElementById('sidebar').classList.remove('menu-active');
  document.body.classList.remove('menu-active');

  console.log("Generating Playlist");
  if (selectedTrackIds.length >= 3){
    try {
      const accessToken = SpotifyAPI.access_token;
      const playlistName = 'Music Swipe Playlist';
  
      const playlist = await SpotifyAPI.createPlaylist(accessToken, playlistName);
      // console.log('Playlist created:', playlist);
      const playlistId = playlist.id;
      const recommendedTracks = await spotifyRecommendations(20);
      console.log(recommendedTracks);
      spotifyPlaylistId = playlistId;
      await SpotifyAPI.addSongsToPlaylist(accessToken, playlistId, recommendedTracks);
      
    } catch (error) {
      console.error('Error handling Spotify redirect:', error);
    }
  }
  else {
    alert("Not enough data, try again after swiping through 3 or more songs!");
  }
  
}

// async function playlistUpdate()

async function getRandomSpotifyTracks(token, tracksEndPoint, numberOfTracks = 1) {
  // console.log ("Random Song: " + numberOfTracks);
  const maxOffset = 50; // Adjust based on total tracks available
  const randomOffset = Math.floor(Math.random() * maxOffset);
  const tracks = await SpotifyAPI.getTracks(token, tracksEndPoint, randomOffset);
  
  let selectedTracks = [];
  let attempts = 0;

  for (let i = 0; i < numberOfTracks; i++) {
    const randomIndex = Math.floor(Math.random() * tracks.length);
    const song = tracks[randomIndex];

    if (song && !selectedTrackIds.includes(song.track.id)) {
      selectedTracks.push(song);
      selectedTrackIds.push(song.track.id); // Add track ID to the list of selected tracks
    }
    attempts++;
  }
  // console.log(selectedTracks);

  if (numberOfTracks!= selectedTracks.length) {
    console.log("Random Tracks not enough tracks");
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return await getRandomSpotifyTracks(token, tracksEndPoint, numberOfTracks);
  }

  return selectedTracks;
}

function getTrackWithLongestWatchTime() {
  return Object.keys(videoDataMap).reduce((a, b) => videoDataMap[a].watchTime > videoDataMap[b].watchTime ? a : b);
}

async function spotifyRecommendations(numberOfTracks = 1) {
  const token = await SpotifyAPI.getToken();
  const genreFrequency = {};
  const artistLikes = {};
  const dislikedArtists = new Set();
  const seedTracks = [];
  const seedGenres = [];

  // Analyze videoDataMap to collect seed data
  for (const videoData of Object.values(videoDataMap)) {
    if (videoData.opinion === 1) { // If user liked this song
      videoData.spotifyArtistsObj.forEach(artist => {
        artistLikes[artist.id] = (artistLikes[artist.id] || 0) + 1;
      });

      const artistGenres = await SpotifyAPI.getArtistGenres(token, videoData.spotifyArtistsObj[0].id);
      artistGenres.forEach(genre => {
        genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
      });
    } else if (videoData.opinion === 2) { // If user disliked this song
      videoData.spotifyArtistsObj.forEach(artist => {
        dislikedArtists.add(artist.id);
      });
    }
  }

  // Filter out disliked artists
  for (const artistId of Object.keys(artistLikes)) {
    if (dislikedArtists.has(artistId)) {
      delete artistLikes[artistId];
    }
  }

  // Select the most frequent genre and a random genre from top 5
  const sortedGenres = Object.entries(genreFrequency).sort((a, b) => b[1] - a[1]);
  if (sortedGenres.length > 0) {
    seedGenres.push(sortedGenres[0][0]);
    if (sortedGenres.length > 1) {
      const randomIndex = Math.floor(Math.random() * Math.min(sortedGenres.length, 5));
      seedGenres.push(sortedGenres[randomIndex][0]);
    }
  }

  // Select a random artist from top 3 most liked artists
  const sortedArtists = Object.entries(artistLikes).sort((a, b) => b[1] - a[1]);
  const seedArtist = sortedArtists.length > 0 ? sortedArtists[Math.floor(Math.random() * Math.min(sortedArtists.length, 3))][0] : null;

  // Select top two liked tracks with the highest watch time
  const likedTracks = Object.values(videoDataMap).filter(v => v.opinion === 1).sort((a, b) => b.watchTime - a.watchTime).slice(0, 2);
  likedTracks.forEach(track => seedTracks.push(track.spotifySongId));
  
  // If there are no liked tracks, use the track with the longest watch time
  if (seedTracks.length < 2) {
    const longestWatchTimeTrackId = getTrackWithLongestWatchTime();
    if (longestWatchTimeTrackId) seedTracks.push(longestWatchTimeTrackId);
  }

  // Fetch recommendations from Spotify
  const recommendations = await SpotifyAPI.getRecommendations(token, numberOfTracks, {
    seed_artists: seedArtist ? [seedArtist] : [],
    seed_tracks: seedTracks.slice(0, 2),
    seed_genres: seedGenres
  });

  return recommendations.map(track => ({track}));
}

let videoIndex = 0;

async function populateCard(trackTitle, autoplay, spotifySongId, spotifyArtistsObj, spotifyGenre) {
  try {
    const response = await gapi.client.youtube.search.list({
      part: "snippet",
      maxResults: 1,
      q: `${trackTitle} Official Music Video`
    });
    await console.log("\nPopulate Song #" + videoIndex + " - " + trackTitle );

    const videoId = response.result.items[0].id.videoId;
    const iframeUrl = `https://www.youtube.com/embed/${videoId}?quality=highres?rel=0&autoplay=${autoplay}&enablejsapi=1`;
    // const iframeUrl = `https://www.youtube.com/embed/EIilZl_iuIo?quality=highres?rel=0&autoplay=${autoplay}&enablejsapi=1`; //tempvideo

    // Get viewport width 
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const vw = Math.max(document.documentElement.clientWdith || 0, window.innerWidth || 0)

    // console.log("width:" + vw + " height:" + vh);
    // Set iframe Height to viewport height
    const iframeHeight = vh; 

    // Set iframe Width based on 16:9 aspect ratio
    const iframeWidth = vh / 0.5625; 
    var iframe;
    // Create iframe
    if (vw > 1600) {
      iframe = `
      <iframe 
        class="yt_player"
        width="${iframeWidth}" 
        height="${iframeHeight}"
        src="${iframeUrl}" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
    }
    else {
      iframe = `
      <iframe 
        class="yt_player"
        width="${iframeWidth}" 
        height="${iframeHeight}"
        src="${iframeUrl}"
        style="width: ${iframeWidth}px; left: calc(50% - ${iframeWidth / 2}px);"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
    }

    // Create a new VideoData instance for the card
    let videoData = new VideoData(trackTitle, spotifySongId, spotifyArtistsObj, spotifyGenre);

    // Add the new VideoData instance to the map
    videoDataMap[spotifySongId] = videoData;

    if (videoIndex === 0) {
      console.log("First video");
      currentVideo = new VideoData(trackTitle, spotifySongId, spotifyArtistsObj, spotifyGenre);
      videoStartTime = Date.now();
    }

    const swiperContainer = document.querySelector('#card-container');
    const newSlide = document.createElement('div');

    newSlide.dataset.songName = trackTitle;
    newSlide.dataset.spotifySongId = spotifySongId;
    newSlide.dataset.spotifyArtistsObj = spotifyArtistsObj;
    newSlide.dataset.spotifyGenre = spotifyGenre;

    newSlide.classList.add('swiper-slide');
    newSlide.innerHTML = `<div class="overlay"><span>${trackTitle}</span></div>`;
    newSlide.innerHTML += iframe;
    swiperContainer.appendChild(newSlide);

    swiper.update();
    videoIndex++;
  } catch (error) {
    console.error('Error populating card:', error);
  }
}

var likeBtn;
var dislikeBtn;
var btnContainer;

const cardLoader = async function(genreId, genreName) {
  try {

    const token = await SpotifyAPI.getToken();
    const playlists = await SpotifyAPI.getPlaylistByGenre(token, genreId);
    console.log("Playlist: " + playlists[0].name);
    const initialTracks = await getRandomSpotifyTracks(token, playlists[0].tracks.href, 2);

    for (let i = 0; i < initialTracks.length; i++) {
      const song = initialTracks[i];
      const autoplay = (i === 0) ? 1 : 0;
      await populateCard(song.track.name, autoplay, song.track.id, song.track.artists, genreId); // Await for each card to be populated
    }

    const floatingButtons = `
      <div class="floating-buttons">
        <button id="dislikeButton" class="floating-btn dislike">Dislike</button> 
        <button id="likeButton" class="floating-btn like">Like</button>
      </div>
    `;

    await document.querySelector('.menu').appendChild(playListButton);
    await document.querySelector('.swiper').classList.remove('swiper-min');
    await document.getElementById('sidebar').classList.remove('menu-active');
    await document.body.classList.remove('menu-active');
    await document.body.classList.add('no-bg');
    await document.getElementById('genre-head').remove();
    await document.getElementById('genres-container').remove();
    await document.querySelector('.swiper').insertAdjacentHTML('afterbegin', floatingButtons);

    likeBtn = document.querySelector('.like');
    dislikeBtn = document.querySelector('.dislike');
    btnContainer = document.querySelector('.floating-buttons');


    // Setup swiper event listener for loading new cards
    setupSwiperListener(token, playlists[0].tracks.href);
  } catch (error) {
    console.error('Error in cardLoader:', error);
  }
};



let videoDataMap = {}; // This object will store the VideoData instances by spotifySongId
let currentVideo = null;
let videoStartTime = 0;
let currentOpinion = 0;

function setupSwiperListener(token, tracksHref) {
  
  likeBtn.addEventListener('click', () => {
    currentOpinion = 1; // Set opinion to 1 for like
    btnContainer.classList.remove('fade-in');
    btnContainer.classList.remove('dis-fade-in');
    btnContainer.classList.add('fade-out');
    document.getElementById('sidebar').classList.remove('menu-active');
    document.body.classList.remove('menu-active');
  });
  
  dislikeBtn.addEventListener('click', () => {
    currentOpinion = 2; // Set opinion to 2 for dislike
    btnContainer.classList.remove('fade-in');
    btnContainer.classList.remove('dis-fade-in');
    btnContainer.classList.add('dis-fade-out');
    swiper.slideNext(); // Go to next slide  
  });


  swiper.on('slideChangeTransitionStart', async function () {
    
    btnContainer.classList.remove('fade-in');
    btnContainer.classList.remove('dis-fade-in');

    document.getElementById('sidebar').classList.remove('menu-active');
    document.body.classList.remove('menu-active');

    btnContainer.classList.remove('fade-out');
    if (currentOpinion == 2) {
      var wasDisliked = 1;
    } else {
      btnContainer.classList.remove('dis-fade-out');
      btnContainer.classList.add('fade-in');
    }

    btnContainer.classList.add('dis-fade-out');

    let previousSlideData = swiper.slides[swiper.previousIndex].dataset;

    if (currentOpinion == 1 && spotifyPlaylistId) {
      var songURI = [{track: {uri: `spotify:track:${previousSlideData.spotifySongId}`} }];
      SpotifyAPI.addSongsToPlaylist(SpotifyAPI.access_token, spotifyPlaylistId, songURI);
    }

    if (previousSlideData && previousSlideData.spotifySongId) {
      var previousVideo;
      if (videoIndex == 0) {
        previousVideo = videoDataMap[swiper.slides[swiper.activeIndex].dataset.spotifySongId];
      } else {
        previousVideo = videoDataMap[previousSlideData.spotifySongId];
      }
      if ((previousVideo && videoStartTime !== 0)) {
        let watchDuration = (Date.now() - videoStartTime) / 1000;
        previousVideo.updateWatchTime(watchDuration);
        if (currentOpinion != 0) {
          previousVideo.updateOpinion(currentOpinion);
          currentOpinion = 0;
        }
        // console.log(previousVideo);
      }
    }

    let activeSlideData = swiper.slides[swiper.activeIndex].dataset;
    if (activeSlideData && activeSlideData.spotifySongId) {
      if (!videoDataMap[activeSlideData.spotifySongId]) {
        // If we don't have a VideoData object for this song, create one
        videoDataMap[activeSlideData.spotifySongId] = new VideoData(
          activeSlideData.songName,
          activeSlideData.spotifySongId,
          activeSlideData.spotifyGenre
        );
      }
      currentVideo = videoDataMap[activeSlideData.spotifySongId];
      if (currentOpinion != 0) {
        currentVideo.updateOpinion(currentOpinion);
        currentOpinion = 0;
      }
      videoStartTime = Date.now();
    }

    const MAX_RETRIES = 10;

  async function retryPopulate(retries) {
    try {
      var newTracks;
      if (selectedTrackIds.length >= 3) {
        newTracks = await spotifyRecommendations();
        console.log('Got recommendations');
        console.log(newTracks);
      }
      else {
        newTracks = await getRandomSpotifyTracks(token, tracksHref, 1);
      }
      const song = newTracks[0];
      await populateCard(song.track.name, 0, song.track.id, song.track.artists, activeSlideData.spotifyGenre);
    } catch (err) {
      if(retries > MAX_RETRIES) {
        throw err;
      }
      
      console.log('Error populating card. Retrying... Try #' + retries);
      
      // Wait 1.5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      // Try again
      await retryPopulate(retries + 1); 
    }
    if (wasDisliked) {
      await new Promise(resolve => setTimeout(resolve, 500)); 
      btnContainer.classList.remove('dis-fade-out');
      btnContainer.classList.remove('fade-out');
      btnContainer.classList.add('dis-fade-in');
    }
    else {
      await new Promise(resolve => setTimeout(resolve, 500)); 
      btnContainer.classList.remove('dis-fade-out');
      btnContainer.classList.remove('fade-out');
      btnContainer.classList.add('dis-fade-in');
    }
  };

    // Load new cards if we reach the end

    if(swiper.activeIndex === swiper.slides.length - 1) {
      await retryPopulate(0);
    };
  });
}

const playListButton = document.createElement('a');

const UILoader = (function() {
  const DomElements = {
    selectGenre: '#genre-head',
    hfToken: '#hidden_token',
    genresContainer: '#genres-container',
  }

  if (window.location.search.includes('code=')) {
    document.getElementById('spotify-login-btn').remove();
    playListButton.classList.add('spotify-playlist-button');
    playListButton.href = '#';
    playListButton.onclick = generateSpotifyPlaylist;
    playListButton.textContent = 'Generate Spotify Playlist';

    // const IDButton = document.createElement('a');
    // IDButton.href = '#';
    // IDButton.onclick = getSpotifyUser;
    // IDButton.textContent = 'Get User ID';
    // document.querySelector('.menu').appendChild(IDButton);
  }

  return {

    
    createGenre(text, value) {
      const button = document.createElement('button');
      button.classList.add('genre-button');
      if (text == "Topplistor") {
        button.textContent = "Top Lists";
      } else {
        button.textContent = text;
      }
      button.onclick = function() {
        cardLoader(value, text);
      };     
      button.value = value;
      document.querySelector(DomElements.genresContainer).appendChild(button);
    },

    storeToken(value) {
      document.querySelector(DomElements.hfToken).value = value;
    },

    getStoredToken() {
      return {
          token: document.querySelector(DOMElements.hfToken).value
      }
    }
  }
})();

const SpotifyLoader = (function(UICtrl, APICtrl){
  const loadGenres = async () => {

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    if (urlParams.get('code')) {
      console.log("Logged in, retrieved Spotify Access Code from URL");
      const tempToken = await SpotifyAPI.fetchAccessToken(urlParams.get('code'));
      SpotifyAPI.access_token = tempToken;
    }

    const token = await APICtrl.getToken();
    const genres = await APICtrl.getCategories(token);
    // console.log(UICtrl);
    
    genres.forEach(element => UICtrl.createGenre(element.name, element.id));
  }
  return {
    loadGenres: loadGenres,
  }

})(UILoader, SpotifyAPI);

document.addEventListener('DOMContentLoaded', function() {
  var menuBtn = document.querySelector('.hamburger-menu');
  var sidebar = document.getElementById('sidebar');
  var body = document.body;

  menuBtn.addEventListener('click', function() {

    console.log("Menu clicked");
    sidebar.classList.toggle('menu-active');
    body.classList.toggle('menu-active');
  });
});

window.onload = async function () {
  loadClient();
  await SpotifyLoader.loadGenres();
};