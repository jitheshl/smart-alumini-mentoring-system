import os

directory = r"e:\INT219\PROJECT\frontend\public\student"

new_link = '        <a href="/student/my-mentors.html" class="nav-item" id="nav-my-mentors"><span class="nav-item-icon">👨‍🏫</span> My Mentors</a>\n'

for filename in os.listdir(directory):
    if filename.endswith(".html"):
        filepath = os.path.join(directory, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        with open(filepath, "w", encoding="utf-8") as f:
            for line in lines:
                f.write(line)
                if 'href="/student/mentors.html"' in line and '<span class="nav-item-icon">' in line:
                    # Some files have id, some don't. We'll just insert after the line that has the Find Mentors link text.
                    f.write(new_link)
                elif 'href="/student/mentors.html"' in line and 'id="nav-mentors"' in line:
                     # For dashboard.html which spreads the tag across lines
                     pass # Wait, dashboard.html has:
                     # <a href="/student/mentors.html" class="nav-item" id="nav-mentors">
                     #   <span class="nav-item-icon">🤝</span> Find Mentors
                     # </a>

print("Finished updating sidebar links in html files.")
