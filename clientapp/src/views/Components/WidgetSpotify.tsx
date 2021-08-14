import { RestHelper } from "helpers/RestHelper";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData, WidgetType } from "models/WidgetModel";
import React from "react";
import Row from "./Row";
import { IoPlaySkipBackOutline, IoPlayBackOutline, IoPlayOutline, IoPlayForwardOutline, IoPlaySkipForwardOutline, IoPauseOutline } from "react-icons/io5"

export const authEndpoint = 'https://accounts.spotify.com/authorize';
const clientId = "13d57354b3ce489bbf2dc93f67f7701d";
const redirectUri = window.location.protocol + "//" + window.location.host;
const scopes = [
    //https://developer.spotify.com/documentation/general/guides/scopes/
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "streaming",
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

//console.log(`Access token: ${hash.access_token}`)

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
        console.log(`setting access token to ${value}`)
        this.updateMe(()=>{this._accessToken = value})
    }

    @observable _state_playdata: SpotifyPlayerResponse = null
    get state_playdata() {return this._state_playdata}
    set state_playdata(value:SpotifyPlayerResponse) {
        action(()=>{this._state_playdata = value})()
    }

    ref_spotify:RestHelper = null;  
    get api() {
        if(!this.accessToken) {return null;}
        this.ref_spotify = new RestHelper("https://api.spotify.com/v1/");
        this.ref_spotify.addHeader("Authorization", `Bearer ${this.accessToken.value}`)
        //console.log(`Setting header to ${this.accessToken.value}`)
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

    private putCommand(command: string) {
        setTimeout(async ()=>{
            console.log(`Spotify command: ${command}`)
            await this.api?.restPut(`me/player/${command}`); 
            this.getCurrentlyPlaying()
        })
    }

    private postCommand(command: string) {
        setTimeout(async ()=>{
            console.log(`Spotify command: ${command}`)
            await this.api?.restPost(`me/player/${command}`,""); 
            this.getCurrentlyPlaying()
        })
    }

    play = () => this.putCommand("play");
    pause = () => this.putCommand("pause");
    next = () => this.postCommand("next");
    prev = () => this.postCommand("previous");
    seek = (delta_s: number) => { 
        if(this.state_playdata) {
            let spot = this.state_playdata.progress_ms + delta_s * 1000;
            if (spot > this.state_playdata.item.duration_ms) spot = this._state_playdata.item.duration_ms;
            if (spot < 0 ) spot = 0;
            this.putCommand(`seek?position_ms=${spot}`);
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
                setTimeout(()=>{
                    const token = JSON.parse(tokenJson);
                    data.accessToken = {
                        value: token.access_token,
                        expireTime:getExpireTime(token.expires_in)
                    }    
                },0)       
            }

        }

        const clearAccessToken = () => {
            setTimeout(()=>{
                data.accessToken = undefined;
                data.state_playdata = undefined;
                window.sessionStorage.removeItem("spotify_access_token")
            },0)
        }

        return (
            <div>
                {data.accessToken && Date.now() < data.accessToken.expireTime
                    ? <div>
                        <div><b>Spotify</b></div>
                        <div>Title: {data.state_playdata?.item.name ?? ""}</div>
                        <div>Artist: {data.state_playdata?.item.artists[0]?.name ?? ""}</div>
                        <Row style={{fontSize: "30px"}}>
                            <IoPlaySkipBackOutline onClick={data.prev}/> 
                            <IoPlayBackOutline onClick={()=>data.seek(-30)}/>
                            { 
                                data.state_playdata?.is_playing 
                                    ? <IoPauseOutline onClick={data.pause}/>
                                    : <IoPlayOutline onClick={data.play}/>
                            }
                            <IoPlayForwardOutline onClick={()=>data.seek(30)}/>
                            <IoPlaySkipForwardOutline  onClick={data.next}/>  
                        </Row>
                        <button onClick={clearAccessToken}>logout</button>
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