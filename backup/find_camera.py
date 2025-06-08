import cv2
import inquirer


def list_available_cameras():
    available_cameras = []
    for i in range(10):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            available_cameras.append(i)
            cap.release()
    return available_cameras


def select_camera_index():
    cameras = list_available_cameras()
    if not cameras:
        print("No cameras detected.")
        return None

    questions = [
        inquirer.List('camera_index',
                      message="Select a camera index",
                      choices=[str(camera) for camera in cameras],
                      ),
    ]

    answers = inquirer.prompt(questions)
    selected_index = int(answers['camera_index']) if answers else None
    return selected_index


if __name__ == "__main__":
    camera_index = select_camera_index()

    if camera_index is not None:
        print(f"Selected camera index: {camera_index}")
        cap = cv2.VideoCapture(camera_index)

        if cap.isOpened():
            print("Camera is opened successfully!")
            # Do something with the camera, e.g., display the video
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                cv2.imshow(f"Camera {camera_index}", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            cap.release()
            cv2.destroyAllWindows()
        else:
            print("Failed to open the selected camera.")
    else:
        print("No camera selected.")
