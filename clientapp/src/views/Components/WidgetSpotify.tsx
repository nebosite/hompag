import { RestHelper } from "helpers/RestHelper";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData, WidgetType } from "models/WidgetModel";
import React from "react";

export const authEndpoint = 'https://accounts.spotify.com/authorize';
const clientId = "13d57354b3ce489bbf2dc93f67f7701d";
const redirectUri = window.location.protocol + "//" + window.location.host;
const scopes = [
  "user-read-currently-playing",
  "user-read-playback-state",
];


const hash = window.location.hash
  .substring(1)
  .split("&")
  .reduce(function(initial:any, item:string) {
    if (item) {
      var parts = item.split("=");
      initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
  }, {});

if(hash.access_token)
{
    const tokenToSave = {
        access_token: hash.access_token,    
        expires_in: hash.expires_in 
    }
    window.sessionStorage.setItem("spotify_access_token",JSON.stringify(tokenToSave))
}

console.log(`Access token: ${hash.access_token}`)

interface SpotifyDevice {
    id: string,
    is_active: boolean,
    is_private_session: boolean,
    is_restricted: boolean,
    name: string,
    type: string,
    volume_percent: number

}

interface SpotifyArtist {
    external_urls: {
        spotify: string
    },
    href: string,
    id: string,
    name: string,
    type: string,
    uri: string
}

interface SpotifyImage {
    height: number,
    url: string,
    width: number
}

interface SpotifyAlbum {
    album_type: string,
    artists: SpotifyArtist[],
    available_markets: any[],
    external_urls: {
        spotify: string
    },
    href: string,
    id: string,
    images: SpotifyImage[],
    name: string,
    release_date: string,
    release_date_precision: string,
    total_tracks: 11,
    type: string,
    uri: string
}

interface SpotifyPlayerResponse {
    device: SpotifyDevice,
    shuffle_state: boolean,
    repeat_state: string,
    timestamp: number,
    context: {
        external_urls: { spotify: string },
        href: string,
        type: string,
        uri: string
    },
    progress_ms: number,
    item: {
        album: SpotifyAlbum,
        artists: SpotifyArtist[],
        available_markets: any[],
        disc_number: number,
        duration_ms: number,
        explicit: boolean,
        external_ids: {
            isrc: string
        },
        external_urls: { spotify: string },
        href: string,
        id: string,
        is_local: boolean,
        name: string,
        popularity: number,
        preview_url: string,
        track_number: number,
        type: string,
        uri: string
    },
    currently_playing_type: string,
    actions: {
        disallows: {
            resuming: boolean
        }
    },
    is_playing: boolean
}

export class SpotifyData extends WidgetModelData
{
    @observable private _accessToken?: {value: string, expireTime: number} 
    get accessToken() {return this._accessToken}
    set accessToken(value:{value: string, expireTime: number}) {
        if(this._accessToken && value && value.value === this._accessToken.value) return;
        this._accessToken = value;
        this.save();
    }

    @observable _state_playdata: SpotifyPlayerResponse = null
    get state_playdata() {return this._state_playdata}
    set state_playdata(value:SpotifyPlayerResponse) {
        this._state_playdata = value;
        this.save();
    }

    ref_spotify:RestHelper = null;  
    get api() {
        if(!this.accessToken) {return null;}
        this.ref_spotify = new RestHelper("https://api.spotify.com/v1/");
        this.ref_spotify.addHeader("Authorization", `Bearer ${this.accessToken.value}`)
        console.log(`Setting header to ${this.accessToken.value}`)
        return this.ref_spotify;
    }

    constructor() {
        super();
        makeObservable(this);
        setTimeout(()=>{this.getCurrentlyPlaying()},50)
    }

    async getCurrentlyPlaying() {
        const api = this.api;
        if(!api) return;

        try {
            const response = await api.restGet<SpotifyPlayerResponse>("me/player");
            this.state_playdata = response;

        }
        catch(err) {
            console.log(`Spotify api eror: ${err}`)
            this.state_playdata = null;
            this.accessToken = null;
        }
    }
}

registerDataTypeForWidgetType(WidgetType.Spotify, "SpotifyData");
registerType("SpotifyData", () => new SpotifyData())

@observer
export default class WidgetSpotify 
extends React.Component<{context: WidgetContainer}> 
{   
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const data = this.props.context.ref_widget.data as SpotifyData; 

        const getExpireTime = (secondsText: string) => {
            return Date.now() + Number.parseInt(secondsText) *  1000;
        }

        if(!data.accessToken)
        {
            const tokenJson = window.sessionStorage.getItem("spotify_access_token")
            if(tokenJson){
                const token = JSON.parse(tokenJson);
                data.accessToken = {
                    value: token.access_token,
                    expireTime:getExpireTime(token.expires_in)
                }           
            }

        }

        return (
            <div>
                {data.accessToken && Date.now() < data.accessToken.expireTime
                    ? <div>
                        <div>Spotify</div>
                        {data.state_playdata
                            ? <div>Now Playing:{data.state_playdata.item.name}</div>
                            : <div>Not playing</div>}
                    </div>
                    : <a
                        onClick={()=>{
                            window.sessionStorage.setItem("autoredirect", window.location.href)
                        }}

                        href={`${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=token&show_dialog=true`}
                        >
                        Login to Spotify
                    </a>
                }
                
            </div> 
        );
    }; 
}