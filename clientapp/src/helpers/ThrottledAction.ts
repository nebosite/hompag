
// -------------------------------------------------------------------
// This accumulates rapid-fire actions into a single update when
// the state settles down.   For instance, it prevents immediately 
// updating a search result every time the user presses a key
// -------------------------------------------------------------------
export class ThrottledAction
{
    private _throttleDelay_ms = 250;
    private _currentId = 0;
    private _action: ()=>void;

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor( action: () => void, minDelay_ms: number = 250) {
        this._throttleDelay_ms = minDelay_ms;
        this._action = action;
    }

    // -------------------------------------------------------------------
    // doSomething
    // -------------------------------------------------------------------
    run()
    {
        const throttleId = ++this._currentId;
       
        const throttleRelease = () => {      
            // Only run if nothing else has come up since I was called
            if(throttleId === this._currentId)
            {
                this._action();
            }
        }

        setTimeout(throttleRelease, this._throttleDelay_ms);
    }

}
