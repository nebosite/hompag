import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData, WidgetType } from "models/WidgetModel";
import React from "react";
import { IoPlaySkipBackOutline, IoPlayBackOutline, IoPlayOutline, IoPlayForwardOutline, IoPlaySkipForwardOutline, IoPauseOutline } from "react-icons/io5"
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { RestHelper } from "helpers/RestHelper";
import {FaSpotify} from "react-icons/fa"
import styles from './WidgetSpotify.module.css';
import Row from "./Row";
import { SpotifyPlayerState, ServerResponse} from "hompag-common";


export class SpotifyData extends WidgetModelData
{

    // @observable _state_playdata: SpotifyPlayerResponse = null
    // get state_playdata() {return this._state_playdata}
    // set state_playdata(value:SpotifyPlayerResponse) {
    //     action(()=>{this._state_playdata = value})()
    // }

    // ref_spotify:RestHelper = null;  
    // get api() {
    //     if(!this.accessToken) {return null;}
    //     this.ref_spotify = new RestHelper("https://api.spotify.com/v1/");
    //     this.ref_spotify.addHeader("Authorization", `Bearer ${this.accessToken.value}`)
    //     //console.log(`Setting header to ${this.accessToken.value}`)
    //     return this.ref_spotify;
    // }


    // // -------------------------------------------------------------------
    // // ctor
    // // -------------------------------------------------------------------
    // constructor() {
    //     super();
    //     makeObservable(this);
    //     setTimeout(()=>{this.getCurrentlyPlaying()},50)
    // }

    // // -------------------------------------------------------------------
    // // 
    // // -------------------------------------------------------------------
    // async getCurrentlyPlaying() {
    //     const api = this.api;
    //     if(!api) return;

    //     try {
    //         const response = await api.restGet<SpotifyPlayerResponse>("me/player");
    //         this.state_playdata = response;
    //     }
    //     catch(err) {
    //         console.log(`Spotify api eror: ${err}`)
    //         this.state_playdata = null;
    //         this.accessToken = null;
    //     }
    // }

    // // -------------------------------------------------------------------
    // // 
    // // -------------------------------------------------------------------
    // private putCommand(command: string) {
    //     setTimeout(async ()=>{
    //         console.log(`Spotify command: ${command}`)
    //         await this.api?.restPut(`me/player/${command}`); 
    //         this.getCurrentlyPlaying()
    //     })
    // }

    // // -------------------------------------------------------------------
    // // 
    // // -------------------------------------------------------------------
    // private postCommand(command: string) {
    //     setTimeout(async ()=>{
    //         console.log(`Spotify command: ${command}`)
    //         await this.api?.restPost(`me/player/${command}`,""); 
    //         this.getCurrentlyPlaying()
    //     })
    // }

    // // -------------------------------------------------------------------
    // // 
    // // -------------------------------------------------------------------
    // play = () => this.putCommand("play");
    // pause = () => this.putCommand("pause");
    // next = () => this.postCommand("next");
    // prev = () => this.postCommand("previous");
    // seek = (delta_s: number) => { 
    //     if(this.state_playdata) {
    //         let spot = this.state_playdata.progress_ms + delta_s * 1000;
    //         if (spot > this.state_playdata.item.duration_ms) spot = this._state_playdata.item.duration_ms;
    //         if (spot < 0 ) spot = 0;
    //         this.putCommand(`seek?position_ms=${spot}`);
    //     }
    // }
    
}

export class SpotifyTransientState
{
    playerState:    ObservableState<SpotifyPlayerState>;
    loggedIn:       ObservableState<boolean>;
    api = new RestHelper("/api/spotify/");
    widgetId: string;

    // -------------------------------------------------------------------
    // 
    // -------------------------------------------------------------------
    constructor(widgetId: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        this.widgetId = widgetId;
        this.playerState = new ObservableState<SpotifyPlayerState>("playerState", stateMaker)
        this.loggedIn = new ObservableState<boolean>("loggedIn", stateMaker)
    } 

    // -------------------------------------------------------------------
    // Call the server's spotify API
    // -------------------------------------------------------------------
    async callApi(api: string, details: any = {})
    {
        details.id  = this.widgetId;
        const response = await this.api.restPost<ServerResponse>(api, JSON.stringify(details));
        if(!response || response?.errorMessage) {
            console.log(`There was a problem with the spotify/${api} call: ${response?.errorMessage}`)
            return null;
        }

        return response.data;
    }

    // -------------------------------------------------------------------
    // Attempt a login
    // -------------------------------------------------------------------
    async login() {
        const response = await this.callApi("login", {sendingPageUrl: window.location.href})
        if(response) {
            window.location.href = response.redirectTo;
        }
    }

    // -------------------------------------------------------------------
    // General control methods
    // -------------------------------------------------------------------
    refresh =   () =>                 { this.callApi("refresh")}
    play =      () =>                 { this.callApi("play") }
    pause =     () =>                 { this.callApi("pause") }
    next =      () =>                 { this.callApi("next") }
    prev =      () =>                 { this.callApi("previous") }
    seek =      (seconds: number) =>  { 
        const state = this.playerState.value;
        if(state?.isPlaying)
        {
            let position_ms = state.position_ms + seconds * 1000;
            if(position_ms < 0) position_ms = 0;
            if(position_ms > state.duration_ms) position_ms = state.duration_ms;
            this.callApi("seek", {position_ms}) 
        }
    }
}

registerDataTypeForWidgetType(WidgetType.Spotify, "SpotifyData");
registerType("SpotifyData", () => new SpotifyData())

@observer
export default class WidgetSpotify 
extends React.Component<{context: WidgetContainer}> 
{   
    private _transientState: SpotifyTransientState

    constructor(props: {context: WidgetContainer})
    {
        super(props);

        
        this._transientState = new SpotifyTransientState(props.context.widgetId, props.context.getStateMaker())
    }

    // -------------------------------------------------------------------
    // renderPlayerUI
    // -------------------------------------------------------------------
    renderPlayerUI() {
        const playerState = this._transientState.playerState.value;
        return <div>
                <div>Song: {(playerState?.isPlaying ? `${playerState.songTitle} by ${playerState.artist}`: "(Not Playing)")}  </div>
                <Row style={{fontSize: "30px"}}>
                    <IoPlaySkipBackOutline onClick={()=>this._transientState.prev()}/> 
                    <IoPlayBackOutline onClick={()=>this._transientState.seek(-30)}/>
                    { 
                        playerState?.isPlaying 
                            ? <IoPauseOutline onClick={()=>this._transientState.pause()}/>
                            : <IoPlayOutline onClick={()=>this._transientState.play()}/>
                    }
                    <IoPlayForwardOutline onClick={()=>this._transientState.seek(30)}/>
                    <IoPlaySkipForwardOutline  onClick={()=>this._transientState.next()}/>  
                </Row>

            </div>
    }

    // -------------------------------------------------------------------
    // renderLogin
    // -------------------------------------------------------------------
    renderLogin() {
        const handleLoginClick = () => this._transientState.login();
        return <button onClick={handleLoginClick}>Login to Spotify</button>
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {

        const handleMouseEnter = () => {
            this._transientState.refresh();
        }

        return (
            <div className={styles.spotifyWidget} onMouseEnter={handleMouseEnter}>
                <div><FaSpotify />Spotify</div>
                { this._transientState.loggedIn.value 
                    ? this.renderPlayerUI()
                    : this.renderLogin()
                }
            
            </div>
        )
    }; 
}

        //const data = this.props.context.ref_widget.data as SpotifyData; 

        // const getExpireTime = (secondsText: string) => {
        //     return Date.now() + Number.parseInt(secondsText) *  1000;
        // }

        // const tokenJson = window.sessionStorage.getItem("spotify_access_token")
        // if(tokenJson) {
        //     console.log(`Token JSON: ${tokenJson}`)
        //     const token = JSON.parse(tokenJson);
        //     if(!data.accessToken || data.accessToken.value !== token.access_token)
        //     {
        //         setTimeout(()=>{
        //             data.accessToken = {
        //                 value: token.access_token,
        //                 expireTime:getExpireTime(token.expires_in)
        //             }    
        //         },0)       
        //     }
        // }

        // const clearAccessToken = () => {
        //     setTimeout(()=>{
        //         window.sessionStorage.removeItem("spotify_access_token")
        //         setTimeout(() => {
        //             data.accessToken = undefined;
        //             data.state_playdata = undefined;
        //         },150)
        //     },0)
        // }

        // return (
        //     <div>
        //         {data.accessToken && Date.now() < data.accessToken.expireTime
        //             ? <div>
        //                 <div><b>Spotify</b></div>
        //                 <div>Title: {data.state_playdata?.item.name ?? ""}</div>
        //                 <div>Artist: {data.state_playdata?.item.artists[0]?.name ?? ""}</div>
        //                 <Row style={{fontSize: "30px"}}>
        //                     <IoPlaySkipBackOutline onClick={data.prev}/> 
        //                     <IoPlayBackOutline onClick={()=>data.seek(-30)}/>
        //                     { 
        //                         data.state_playdata?.is_playing 
        //                             ? <IoPauseOutline onClick={data.pause}/>
        //                             : <IoPlayOutline onClick={data.play}/>
        //                     }
        //                     <IoPlayForwardOutline onClick={()=>data.seek(30)}/>
        //                     <IoPlaySkipForwardOutline  onClick={data.next}/>  
        //                 </Row>
        //                 <button onClick={clearAccessToken}>logout</button>
        //             </div>
        //             : <a
        //                 onClick={()=>{
        //                     window.sessionStorage.setItem("autoredirect", window.location.href)
        //                 }}

        //                 href={`${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=token&show_dialog=true`}
        //                 >
        //                 Login to Spotify
        //             </a>
        //         }
        //         <div onClick={()=> this._transientState.foo.value = Date.now().toString()}>Trans: {this._transientState.foo.value} </div>
        //     </div> 
        // );
