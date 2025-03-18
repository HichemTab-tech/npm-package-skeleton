import * as React from 'react';
import {GiveHichemTabTechCredit, MyComponent} from '../dist/main.js'; // Import your built library

const App = () => {

    GiveHichemTabTechCredit();

    return (
        <div>
            <h1 className="text-red-600">%PACKAGE-NAME% Demo</h1>
            <MyComponent/>
        </div>
    );
};

export default App;