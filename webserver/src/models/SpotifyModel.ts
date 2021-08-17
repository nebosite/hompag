import { objectToUriParams } from "../helpers/httpStuff";
import { ILogger } from "../helpers/logger";
import { restCall } from "../helpers/rest";
import { PageResponse, UserError } from "../helpers/SafeSend";
var querystring = require('querystring');

const spotifyTokenEndpoint = "https://accounts.spotify.com/api/token"
const spotifyAuthEndpoint =  'https://accounts.spotify.com/authorize'

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

export class SpotifyModel
{
    clientId: string;
    clientSecret: string;
    _pendingStates = new Map<string, any>();
    _credentialCache = new Map<string, SpotifyCredentialCache>();
    _logger:ILogger;

    //------------------------------------------------------------------------------------------
    // ctor
    //------------------------------------------------------------------------------------------
    constructor(logger: ILogger, clientId:string, clientSecret: string)
    {
        this._logger = logger;
        this.clientId = clientId
        this.clientSecret = clientSecret
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
        const tokenRequest = {           
            grant_type : "authorization-code",
            code: query.code,
            redirect_uri: state.redirect_uri,
            client_id : this.clientId,
            client_secret: this.clientSecret
        }

        const headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        const tokenResponse = await restCall<SpotifyTokenResponse>("POST", headers, spotifyTokenEndpoint, querystring.stringify(tokenRequest))
        const cacheInfo:SpotifyCredentialCache = {
            expireDate: Date.now() +  tokenResponse.expires_in * 1000 - 60000,
            code: query.code,
            tokenDetails: tokenResponse
        }
        this._credentialCache.set(state.details.id, cacheInfo)
        
        this._logger.logLine("Spotify successfully logged in.")
        return PageResponse.Redirect(state.details.sendingPageUrl)
    }

    //------------------------------------------------------------------------------------------
    // handleSpotifyCommand
    //------------------------------------------------------------------------------------------
    handleSpotifyCommand(command: string, currentUri: string, body: any): any {
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
                const stateId = `${body.id}_${Date.now()}`
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

