/**
 * NotFound (404) Page
 */

import React from 'react';
import './NotFound.css';

export default function NotFound() {
    return (
        <div>
            <div className="maincontainer">
                <div className="bat">
                    <img className="wing leftwing" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-wing.png" alt="wing" />
                    <img className="body" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-body.png" alt="bat" />
                    <img className="wing rightwing" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-wing.png" alt="wing" />
                </div>
                <div className="bat">
                    <img className="wing leftwing" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-wing.png" alt="wing" />
                    <img className="body" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-body.png" alt="bat" />
                    <img className="wing rightwing" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-wing.png" alt="wing" />
                </div>
                <div className="bat">
                    <img className="wing leftwing" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-wing.png" alt="wing" />
                    <img className="body" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-body.png" alt="bat" />
                    <img className="wing rightwing" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/bat-wing.png" alt="wing" />
                </div>
                <img className="foregroundimg" src="https://www.blissfullemon.com/wp-content/uploads/2018/09/HauntedHouseForeground.png" alt="haunted house" />
            </div>
            <h1 className="errorcode">ERROR 404</h1>
            <div className="errortext">This area is forbidden. Turn back now!</div>
        </div>
    );
}
