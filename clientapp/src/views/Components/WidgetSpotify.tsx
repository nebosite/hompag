import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData, WidgetType } from "models/WidgetModel";
import React from "react";
//import { IoPlaySkipBackOutline, IoPlayBackOutline, IoPlayOutline, IoPlayForwardOutline, IoPlaySkipForwardOutline, IoPauseOutline } from "react-icons/io5"
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { RestHelper } from "helpers/RestHelper";

// export const authEndpoint = 'https://accounts.spotify.com/authorize';
// const clientId = "13d57354b3ce489bbf2dc93f67f7701d";
// const redirectUri = window.location.protocol + "//" + window.location.host;
// const scopes = [
//     //https://developer.spotify.com/documentation/general/guides/scopes/
//   "user-read-currently-playing",
//   "user-read-playback-state",
//   "user-modify-playback-state",
//   "streaming",
// ];


// const hash = window.location.hash
//   .substring(1)
//   .split("&")
//   .reduce(function(initial:any, item:string) {
//     if (item) {
//       var parts = item.split("=");
//       initial[parts[0]] = decodeURIComponent(parts[1]);
//     }
//     return initial;
//   }, {});

// if(hash.access_token)
// {
//     const tokenToSave = {
//         access_token: hash.access_token,    
//         expires_in: hash.expires_in 
//     }
//     window.sessionStorage.setItem("spotify_access_token",JSON.stringify(tokenToSave))
// }

//console.log(`Access token: ${hash.access_token}`)



interface ServerResponse {
    errorMessage?: string
    data?: any
}

interface SpotifyPlayerState {
    songTitle: string

}



export class SpotifyTransientState
{
    playerState:    ObservableState<SpotifyPlayerState>;
    loggedIn:       ObservableState<boolean>;
    api = new RestHelper("/api/spotify/");

    // -------------------------------------------------------------------
    // 
    // -------------------------------------------------------------------
    constructor(stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        this.playerState = new ObservableState<SpotifyPlayerState>("playerState", stateMaker)
        this.loggedIn = new ObservableState<boolean>("loggedIn", stateMaker)
    } 

    // -------------------------------------------------------------------
    // Attempt a login
    // -------------------------------------------------------------------
    async login(widgetId: string) {
        const details ={
            id: widgetId,
            sendingPageUrl: window.location.href
        }
        const response = await this.api.restPost<ServerResponse>("login", JSON.stringify(details));
        if(response?.data) {
            console.log(`Server Responded with: ${JSON.stringify(response.data)}`)
            window.location.href = response.data.redirectTo;
        }
        else {
            console.log(`There was a problem with the spotify login: ${response?.errorMessage}`)
        }
    }

}

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

        
        this._transientState = new SpotifyTransientState(props.context.getStateMaker())
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
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

        return (
            <div>
                { this._transientState.loggedIn.value 
                    ? <div>Now Playing: {this._transientState.playerState.value?.songTitle}</div>
                    : <button onClick={()=>this._transientState.login(context.widgetId)}>Login to Spotify</button>
                }
            
            </div>
        )
    }; 
}