
// -------------------------------------------------------------------
// This accumulates rapid-fire actions into a single update when
// the state settles down.   For instance, it prevents immediately 
// updating a search result every time the user presses a key
// -------------------------------------------------------------------
export class ThrottledAction
{
    private _throttleDelay_ms = 250;
    private _currentId = 0;

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(  minDelay_ms: number = 250) {
        this._throttleDelay_ms = minDelay_ms;
    }

    // -------------------------------------------------------------------
    // doSomething
    // -------------------------------------------------------------------
    run(action: () => void)
    {
        const throttleId = ++this._currentId;
       
        const throttleRelease = () => {      
            // Only run if nothing else has come up since I was called
            if(throttleId === this._currentId)
            {
                action();
            }
        }

        setTimeout(throttleRelease, this._throttleDelay_ms);
    }

}
