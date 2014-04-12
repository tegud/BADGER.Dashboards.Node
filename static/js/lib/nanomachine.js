var nano = {} || nano;

(function () {
    var arraySlice = Array.prototype.slice;

    nano.Machine = function (options) {
        var currentState,
			internalApi = {
			    transitionToState: function (newState) {
			        currentState = newState;

			        return executeEventHandler('_onEnter', arraySlice.call(arguments, 1));
			    }
			};

        function executeEventHandler(eventName, argumentsArray) {
            var eventHandler = options.states[currentState][eventName];

            if (eventHandler) {
                return eventHandler.apply(internalApi, argumentsArray);
            }
        }

        internalApi.transitionToState(options.initialState);

        return {
            handle: function (eventName) {
                return executeEventHandler(eventName, arraySlice.call(arguments, 1));
            }
        };
    };
})();