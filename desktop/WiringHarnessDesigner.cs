using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Wiring Harness Designer")]
[assembly: AssemblyDescription("Offline wiring harness drawing and instruction editor")]
[assembly: AssemblyCompany("Wiring Harness Designer")]
[assembly: AssemblyProduct("Wiring Harness Designer")]
[assembly: AssemblyVersion("1.1.8.0")]
[assembly: AssemblyFileVersion("1.1.8.0")]

internal static class WiringHarnessDesignerProgram
{
    private const string ProductFolderName = "WiringHarnessDesigner";
    private static readonly string[] AppFiles =
    {
        "index.html",
        "styles.css",
        "app.js",
        "VERSION.txt",
        "CHANGELOG.md",
        "README.md"
    };

    [STAThread]
    private static void Main()
    {
        try
        {
            string appDirectory = FindOrExtractApp();
            string indexPath = Path.Combine(appDirectory, "index.html");
            string edgePath = FindEdge();

            if (!File.Exists(indexPath))
            {
                throw new FileNotFoundException("The application screen could not be found.", indexPath);
            }

            if (edgePath != null)
            {
                string appUrl = new Uri(indexPath).AbsoluteUri;
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = edgePath,
                    Arguments = "--app=" + Quote(appUrl) + " --window-size=1600,1000 --no-first-run --disable-default-apps",
                    WorkingDirectory = appDirectory,
                    UseShellExecute = false
                };
                Process.Start(startInfo);
                return;
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = indexPath,
                WorkingDirectory = appDirectory,
                UseShellExecute = true
            });
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "Wiring Harness Designer could not start.\r\n\r\n" + error.Message,
                "Wiring Harness Designer",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }

    private static string FindOrExtractApp()
    {
        string executableDirectory = AppDomain.CurrentDomain.BaseDirectory;
        if (HasAppFiles(executableDirectory))
        {
            return executableDirectory;
        }

        string documentsDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            "WiringHarnessDesigner"
        );
        if (HasAppFiles(documentsDirectory))
        {
            return documentsDirectory;
        }

        string extractedDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            ProductFolderName,
            "App"
        );
        Directory.CreateDirectory(extractedDirectory);

        foreach (string fileName in AppFiles)
        {
            ExtractResource(fileName, Path.Combine(extractedDirectory, fileName));
        }

        return extractedDirectory;
    }

    private static bool HasAppFiles(string directory)
    {
        return File.Exists(Path.Combine(directory, "index.html"))
            && File.Exists(Path.Combine(directory, "styles.css"))
            && File.Exists(Path.Combine(directory, "app.js"));
    }

    private static void ExtractResource(string fileName, string destinationPath)
    {
        Assembly assembly = Assembly.GetExecutingAssembly();
        string resourceName = ProductFolderName + "." + fileName;

        using (Stream input = assembly.GetManifestResourceStream(resourceName))
        {
            if (input == null)
            {
                throw new InvalidOperationException("Missing embedded application file: " + fileName);
            }

            using (MemoryStream memory = new MemoryStream())
            {
                input.CopyTo(memory);
                byte[] newData = memory.ToArray();

                if (File.Exists(destinationPath))
                {
                    byte[] existingData = File.ReadAllBytes(destinationPath);
                    if (ByteArraysMatch(existingData, newData))
                    {
                        return;
                    }
                }

                File.WriteAllBytes(destinationPath, newData);
            }
        }
    }

    private static bool ByteArraysMatch(byte[] left, byte[] right)
    {
        if (left.Length != right.Length)
        {
            return false;
        }

        for (int index = 0; index < left.Length; index++)
        {
            if (left[index] != right[index])
            {
                return false;
            }
        }

        return true;
    }

    private static string FindEdge()
    {
        string[] candidates =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "Edge", "Application", "msedge.exe")
        };

        foreach (string candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }

    private static string Quote(string input)
    {
        return "\"" + input.Replace("\"", "\\\"") + "\"";
    }
}
