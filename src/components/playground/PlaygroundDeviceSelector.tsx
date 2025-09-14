import { useMediaDeviceSelect } from "@livekit/components-react";
import { useEffect, useState } from "react";

type PlaygroundDeviceSelectorProps = {
  kind: MediaDeviceKind;
};

export const PlaygroundDeviceSelector = ({
  kind,
}: PlaygroundDeviceSelectorProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const deviceSelect = useMediaDeviceSelect({ kind: kind });
  const [selectedDeviceName, setSelectedDeviceName] = useState("");

  useEffect(() => {
    deviceSelect.devices.forEach((device) => {
      if (device.deviceId === deviceSelect.activeDeviceId) {
        setSelectedDeviceName(device.label);
      }
    });
  }, [deviceSelect.activeDeviceId, deviceSelect.devices, selectedDeviceName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="relative">
      <button
        className="flex gap-2 items-center px-3 py-2 bg-background text-foreground border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors min-w-[120px] justify-between"
        onClick={(e) => {
          setShowMenu(!showMenu);
          e.stopPropagation();
        }}
      >
        <span className="flex-1 text-left text-sm overflow-ellipsis overflow-hidden whitespace-nowrap">
          {selectedDeviceName || "Select device"}
        </span>
        <ChevronSVG />
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 min-w-[200px] max-h-48 overflow-y-auto">
          {deviceSelect.devices.map((device, index) => {
            const isActive = device.deviceId === deviceSelect.activeDeviceId;
            return (
              <div
                onClick={() => {
                  deviceSelect.setActiveMediaDevice(device.deviceId);
                  setShowMenu(false);
                }}
                className={`text-sm py-3 px-4 cursor-pointer transition-colors border-b border-border last:border-b-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
                key={index}
              >
                <div className="flex items-center gap-2">
                  {isActive && <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>}
                  <span className={isActive ? "" : "ml-4"}>{device.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ChevronSVG = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3 5H5V7H3V5ZM7 9V7H5V9H7ZM9 9V11H7V9H9ZM11 7V9H9V7H11ZM11 7V5H13V7H11Z"
      fill="currentColor"
      fillOpacity="0.8"
    />
  </svg>
);
