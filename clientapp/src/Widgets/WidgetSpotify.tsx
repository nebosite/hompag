import { observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import { IoPlaySkipBackOutline, IoPlayBackOutline, IoPlayOutline, IoPlayForwardOutline, IoPlaySkipForwardOutline, IoPauseOutline } from "react-icons/io5"
import { ObservableState, TransientStateHandler } from "models/TransientState";
import { RestHelper } from "helpers/RestHelper";
import {FaSpotify} from "react-icons/fa"
import styles from './WidgetSpotify.module.css';
import Row from "../Components/Row";
import { SpotifyPlayerState, SpotifyServerResponse} from "hompag-common";
import { registerWidget, WidgetType } from "widgetLibrary";
import { action, makeObservable, observable } from "mobx";
import WidgetBase from "./WidgetBase";


export class SpotifyData extends WidgetModelData
{

    // @observable _state_playdata: SpotifyPlayerResponse = null
    // get state_playdata() {return this._state_playdata}
    // set state_playdata(value:SpotifyPlayerResponse) {
    //     action(()=>{this._state_playdata = value})()
    // }

    
}

export class SpotifyTransientState
{
    playerState:    ObservableState<SpotifyPlayerState>;
    loggedIn:       ObservableState<boolean>;
    api = new RestHelper("/api/spotify/");
    widgetId: string;

    get elapsedString() { return this.msToTimeString(this.playerPosition ?? 0) }
    get durationString() { return this.msToTimeString(this.playerState.value?.duration_ms ?? 0) }

    @observable private _playerPosition = 0;
    get playerPosition() {return this._playerPosition}
    set playerPosition(value: number) {action(()=>{this._playerPosition = value})()}

    private stopped = false;
    // -------------------------------------------------------------------
    // 
    // -------------------------------------------------------------------
    constructor(widgetId: string, stateMaker : <T>(name: string, handler: (data: T)=>void)=> TransientStateHandler<T>)
    {
        makeObservable(this);
        this.widgetId = widgetId;
        this.playerState = new ObservableState<SpotifyPlayerState>("playerState", stateMaker)
        this.loggedIn = new ObservableState<boolean>("loggedIn", stateMaker)

        const ticker = ()=>{
            if(this.playerState.value?.isPlaying && this.playerState.value?.duration_ms > 0) {
                this.playerPosition = Date.now() - this.playerState.updateTime + this.playerState.value.position_ms;
                if(this.playerPosition > this.playerState.value.duration_ms) {
                    console.log("refreshing Spotify player status...")
                    this.refresh();
                }
            }
            if(!this.stopped) setTimeout(ticker, 200);
            else console.log("Spotify Ticker is Stopped")
        }
        ticker();
    } 

    stop() {this.stopped = true;}

    // -------------------------------------------------------------------
    // Display ms as hh:mm:ss
    // -------------------------------------------------------------------
    private msToTimeString(ms: number) {
        const seconds = Math.floor(ms/1000) % 60;
        const minutes = Math.floor(ms/60000) % 60;
        const hours = Math.floor(ms/3600000)

        const secondsStr = seconds.toString().padStart(2, "0")
        const minutesStr = hours > 0 ? minutes.toString().padStart(2, "0") : minutes.toString()
        const hoursStr = hours > 0 ? `${hours.toString()}:` : ""

        return `${hoursStr}${minutesStr}:${secondsStr}`
    }

    // -------------------------------------------------------------------
    // Call the server's spotify API
    // -------------------------------------------------------------------
    async callApi(api: string, details: any = {})
    {
        details.id  = this.widgetId;
        const response = await this.api.restPost<SpotifyServerResponse>(api, JSON.stringify(details));
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

@observer
export default class WidgetSpotify 
extends WidgetBase<{context: WidgetContainer}>  
{   
    private _transientState: SpotifyTransientState

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        registerWidget(WidgetType.Spotify, c => <WidgetSpotify context={c} />, "SpotifyData", () => new SpotifyData())    
    }

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {context: WidgetContainer})
    {
        super(props);

        
        this._transientState = new SpotifyTransientState(props.context.widgetId, props.context.getStateMaker())
    }

    // -------------------------------------------------------------------
    // componentWillUnmount
    // -------------------------------------------------------------------
    componentWillUnmount() {
        this._transientState.stop();
    }

    // -------------------------------------------------------------------
    // renderPlayerUI
    // -------------------------------------------------------------------
    renderPlayerUI() {
        const playerState = this._transientState.playerState.value;

        return <div>
                <div>Song: {(playerState?.songTitle ? `${playerState.songTitle} by ${playerState.artist}`: "(Not Playing)")}  </div>
                <div>Time: {this._transientState.elapsedString}/{this._transientState.durationString}</div>
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
    renderContent() {

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

    renderConfigUI = () => <div></div>
}

