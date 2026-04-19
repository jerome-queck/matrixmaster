import React from 'react';

type MacWindowChromeProps = {
    title?: string;
    children: React.ReactNode;
};

const MacWindowChrome: React.FC<MacWindowChromeProps> = ({
    title = 'Matrix Master — Workspace.mmatrix',
    children,
}) => {
    return (
        <div className="lab-desk">
            <div className="lab-window">
                <div className="lab-titlebar">
                    <div className="lab-traffic">
                        <button
                            type="button"
                            aria-label="Close"
                            className="lab-traffic-dot close"
                        />
                        <button
                            type="button"
                            aria-label="Minimize"
                            className="lab-traffic-dot min"
                        />
                        <button
                            type="button"
                            aria-label="Maximize"
                            className="lab-traffic-dot max"
                        />
                    </div>
                    <div className="lab-titlebar-title">{title}</div>
                </div>
                <div className="lab-workspace">{children}</div>
            </div>
        </div>
    );
};

export default MacWindowChrome;
