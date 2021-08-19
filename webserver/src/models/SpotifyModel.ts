import { objectToUriParams } from "../helpers/httpStuff";
import { ILogger } from "../helpers/logger";
import { restCall } from "../helpers/rest";
import { PageResponse, UserError } from "../helpers/SafeSend";
import { StatePacket } from "./ServerModel";
var querystring = require('querystring');

const spotifyTokenEndpoint = "https://accounts.spotify.com/api/token"
const spotifyAuthEndpoint =  'https://accounts.spotify.com/authorize'
const spotifyApiEndpoint = 'https://api.spotify.com/v1'

export interface SpotifyLoginDetails {
    details: {
        id: string
        sendingPageUrl: string        
    }
    redirect_uri: string
}

interface SpotifyCredentialCache{
    expireDate: number
    tokenDetails: SpotifyTokenResponse
    code: string
}

interface SpotifyTokenResponse {
    access_token:	string      //	An access token for spotify calls.
    token_type:	string	        //	always “Bearer”.
    scope:	string	            //	A space-separated list of scopes which have been granted for this access_token
    expires_in:	number          //	The time period (in seconds) for which the access token is valid.
    refresh_token:	string	    //	A token that can be sent to the Spotify Accounts service in place of an authorization code. 
    //(When the access code expires, send a POST request to the Accounts service /api/token endpoint, but use this code 
    // in place of an authorization code. A new access token will be returned. A new refresh token might be returned too.)  
}


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


export class SpotifyModel
{
    clientId: string;
    clientSecret: string;
    _pendingStates = new Map<string, any>();
    _credentialCache = new Map<string, SpotifyCredentialCache>();
    _logger:ILogger;
    _reportStateChange: (state: StatePacket) => void = ()=>{}

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(
        logger: ILogger, 
        clientId:string, 
        clientSecret: string, 
        _reportStateChange: (state: StatePacket) => void )
    {
        this._logger = logger;
        this.clientId = clientId
        this.clientSecret = clientSecret
        this._reportStateChange = _reportStateChange;
    }

    //------------------------------------------------------------------------------------------
    // handleLoginResponse
    //------------------------------------------------------------------------------------------
    async handleLoginResponse(query: any) {
        // this.logger.logLine(`code: ${query.code}`)
        // this.logger.logLine(`state: ${query.state}`)
        if(!query.code){
            return new PageResponse(`<html> Spotify login failed: ${query.error} </html>`)
        }
        const state = this._pendingStates.get(query.state) as SpotifyLoginDetails;
        if(!state) {
            throw Error(`Whoops:  No state for pending login response`)
        }
        const widgetId = state.details.id;
        
        const tokenRequest = {           
            grant_type : "authorization_code",
            code: query.code,
            redirect_uri: state.redirect_uri,
            client_id : this.clientId,
            client_secret: this.clientSecret
        }

    

        const headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        const tokenResponse = await restCall<SpotifyTokenResponse>("POST", headers, spotifyTokenEndpoint, querystring.stringify(tokenRequest))
        if(!tokenResponse) throw Error("Spotify login failed with no token received")
        this._logger.logLine("Spotify successfully logged in.")

        this._reportStateChange({id: widgetId, name: "loggedIn", data: true})
        const cacheInfo:SpotifyCredentialCache = {
            expireDate: Date.now() +  tokenResponse.expires_in * 1000 - 60000,
            code: query.code,
            tokenDetails: tokenResponse
        }
        this._credentialCache.set(widgetId, cacheInfo)

        // update the player state after there has been a chance to
        // get the user back to the page
        setTimeout(()=>this.updatePlayerState(widgetId),200)

        return PageResponse.Redirect(state.details.sendingPageUrl)
    }

    //------------------------------------------------------------------------------------------
    // callApi
    //------------------------------------------------------------------------------------------
    callApi<T>(command: string, token: string) {
        const apiHeaders = {'Authorization': `Bearer ${token}`}
        const endPoint = spotifyApiEndpoint + `/me/${command}`;
        return restCall<T>("GET", apiHeaders, endPoint)
    }

    //------------------------------------------------------------------------------------------
    // updatePlayerState
    //------------------------------------------------------------------------------------------
    private async updatePlayerState(widgetId: string)
    {
        const credentials = this._credentialCache.get(widgetId);
        if(!credentials){
            throw Error(`Missing credentials for widget id: ${widgetId}`)
        }

        const state = await this.callApi<SpotifyPlayerResponse>("player",credentials.tokenDetails.access_token)

        const data = {
            songTitle: state.item.name
        }
        const statePacket = {
            id: widgetId, name: "playerState", data
        }
        this._reportStateChange(statePacket)
    }

    //------------------------------------------------------------------------------------------
    // handleSpotifyCommand
    //------------------------------------------------------------------------------------------
    handleSpotifyCommand(command: string, currentUri: string, body: any): any {
        const widgetId = body.id;
        const client_id = this.clientId; 
        const redirect_uri = `${currentUri}/api/loginresponder/spotify`;
        const scopes = [
            //https://developer.spotify.com/documentation/general/guides/scopes/
          "user-read-currently-playing",
          "user-read-playback-state",
          "user-modify-playback-state",
          "streaming",
        ];


        switch(command){
            case "login": 
                const stateId = `${widgetId}_${Date.now()}`
                this._pendingStates.set(stateId, {details: body, redirect_uri})
                const uriParams = {
                    client_id,
                    redirect_uri,
                    scope: scopes.join("%20"),
                    response_type: "code",
                    state: stateId
                }
                const userRedirect = `${spotifyAuthEndpoint}?${objectToUriParams(uriParams)}`
                return  { 
                    redirectTo: userRedirect
                }
            default: throw new UserError(`Unknown spotify command: ${command}`)
        }
    }


}

