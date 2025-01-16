import tkinter as tk

def main():
    root = tk.Tk()
    root.title("Games on the Go")

    label = tk.Label(root, text="Welcome to Games on the Go!", font=("Helvetica", 16))
    label.pack(pady=20)

    start_button = tk.Button(root, text="Start", command=start_program)
    start_button.pack(pady=10)

    exit_button = tk.Button(root, text="Exit", command=root.quit)
    exit_button.pack(pady=10)

    root.mainloop()

def start_program():
    print("Program started")

if __name__ == "__main__":
    main()