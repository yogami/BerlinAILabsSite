import os
import re
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestBerlinAILabsPositioning(unittest.TestCase):
    """Acceptance test suite verifying Agent Harnessing focus, Classic Lab vibe,
    open-ended contact, and absence of consulting/agency or AI-slop patterns."""

    def _read(self, rel_path: str) -> str:
        full_path = os.path.join(ROOT_DIR, rel_path)
        self.assertTrue(os.path.exists(full_path), f"Missing expected file: {rel_path}")
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()

    def test_index_centers_on_agent_harnessing_and_kernel(self):
        html = self._read("index.html")
        required_concepts = [
            "Agent = Model + Harness",
            "agent_kernel",
            "In-Flight Agent Steering",
            "Tri-State Memory",
            "Verification Air-Lock",
            "Knowledge Graph",
            "Hybrid RAG",
            "Reciprocal Rank Fusion",
            "OpenTelemetry",
            "Domain Pack",
            "Finite State Machine",
        ]
        for concept in required_concepts:
            self.assertIn(
                concept.lower(),
                html.lower(),
                f"index.html must highlight core agent harnessing concept: '{concept}'",
            )

    def test_flagship_agent_kernel_and_steering_pages_exist(self):
        kernel_html = self._read("agent-kernel.html")
        self.assertIn("Tri-State Memory", kernel_html)
        self.assertIn("Finite State Machine", kernel_html)
        self.assertIn("Domain Pack", kernel_html)
        self.assertIn("In-Flight", kernel_html)

        steering_blog = self._read("blog/agent-harness-steering-graphs.html")
        self.assertIn("SmPC", steering_blog)
        self.assertIn("SNOMED", steering_blog)
        self.assertIn("ISO 14971", steering_blog)
        self.assertIn("OpenTelemetry", steering_blog)

    def test_secondary_work_preserved_on_index(self):
        html = self._read("index.html")
        secondary_projects = [
            "aegismcp.html",
            "courtroom-demo.html",
            "ConvoGuardAI.html",
            "AgentTrustProtocol.html",
            "sota-video-architecture.html",
            "n8ncaseStudy.html",
            "caa-framework.html",
        ]
        for proj in secondary_projects:
            self.assertIn(
                proj,
                html,
                f"Secondary Berlin AI Labs project '{proj}' must remain preserved on index.html",
            )

    def test_grounded_bio_and_no_overclaims_on_index(self):
        html = self._read("index.html")
        # 1. Exact verified LinkedIn link
        self.assertIn(
            'href="https://www.linkedin.com/in/yami-g-b170294/"',
            html,
            "index.html must use exact verified LinkedIn URL https://www.linkedin.com/in/yami-g-b170294/",
        )
        self.assertNotIn(
            "linkedin.com/in/yamigopal",
            html,
            "index.html must not contain obsolete /yamigopal link",
        )

        # 2. Grounded 20-year bio with real enterprise track record
        for grounded_item in [
            "twenty years of systems engineering",
            "Tallan",
            "Hike",
            "Personio",
            "Boehringer Ingelheim",
            "four years building AI systems",
            "ReelBerlin",
            "ConvoGuard AI",
            "AegisMCP",
        ]:
            self.assertIn(
                grounded_item.lower(),
                html.lower(),
                f"index.html must reflect grounded experience: '{grounded_item}'",
            )

        # 3. No inaccurate financial backend claims or academic/crypto over-claims on index
        banned_overclaims = [
            "fifteen years of high-throughput financial backends across Europe",
            "Pearlian",
            "do(X)",
            "TEE Gateway",
        ]
        for overclaim in banned_overclaims:
            self.assertNotIn(
                overclaim,
                html,
                f"index.html must not contain overclaim '{overclaim}'",
            )

    def test_senior_architect_integrity_checks(self):
        dead_subdomains = [
            "agentops.berlinailabs.de",
            "canary.berlinailabs.de",
            "scanner.berlinailabs.de",
            "evidence.berlinailabs.de",
            "tools.berlinailabs.de",
            "api.berlinailabs.de",
            "npmjs.com/package/agent-pentest",
        ]
        unbacked_claims = [
            "ZK-proofs",
            "0ms Interception",
            "Sub-20ms ONNX",
            "sub-20ms ONNX",
        ]
        html_files = [
            f for f in os.listdir(ROOT_DIR) if f.endswith(".html")
        ] + [
            os.path.join("blog", f)
            for f in os.listdir(os.path.join(ROOT_DIR, "blog"))
            if f.endswith(".html")
        ]
        for rel_path in html_files:
            content = self._read(rel_path)
            for dead in dead_subdomains:
                self.assertNotIn(
                    dead,
                    content,
                    f"Dead subdomain or package '{dead}' found in {rel_path}",
                )
            for claim in unbacked_claims:
                self.assertNotIn(
                    claim,
                    content,
                    f"Unbacked architectural claim '{claim}' found in {rel_path}",
                )

        kernel_html = self._read("agent-kernel.html")
        for authentic_ref in [
            "core/execution_loop.py",
            "core/memory_promoter.py",
            "core/graph_memory.py",
            "ops/run_abc_clinical_eval_v2.py",
            "ops/benchmark.py",
            "Mandatory Methodological Disclosure",
        ]:
            self.assertIn(
                authentic_ref,
                kernel_html,
                f"agent-kernel.html must reference authentic agenticAI artifact '{authentic_ref}'",
            )

        for simulator_page in ["courtroom-demo.html", "vera-demo.html"]:
            sim_html = self._read(simulator_page)
            self.assertIn(
                "window.crypto.subtle",
                sim_html,
                f"{simulator_page} must use real browser WebCrypto (window.crypto.subtle)",
            )

    def test_no_consulting_agency_or_overt_job_ad_signals_across_site(self):
        banned_agency_or_job_phrases = [
            "sales@berlinailabs.de",
            "Request Review",
            "Review anfragen",
            "Request Attack-Surface Review",
            "Request Security Review",
            "Request a Pilot",
            "1-Week Pilot Program",
            "Book a Call",
            "pay.berlinailabs.de",
            "€99",
            "Available for Principal and Staff",
        ]
        html_files = [
            f for f in os.listdir(ROOT_DIR) if f.endswith(".html")
        ] + [
            os.path.join("blog", f)
            for f in os.listdir(os.path.join(ROOT_DIR, "blog"))
            if f.endswith(".html")
        ]
        for rel_path in html_files:
            content = self._read(rel_path)
            for phrase in banned_agency_or_job_phrases:
                self.assertNotIn(
                    phrase,
                    content,
                    f"Found agency/sales/job-ad phrase '{phrase}' in {rel_path}",
                )

    def test_no_em_dashes_or_banned_buzzwords_in_primary_pages(self):
        primary_pages = [
            "index.html",
            "agent-kernel.html",
            "blog.html",
            "blog/agent-harness-steering-graphs.html",
        ]
        banned_words = [
            "delve",
            "testament",
            "leverage",
            "revolutionize",
            "synergistic",
            "unlock",
            "showcase",
            "pivotal",
            "furthermore",
            "moreover",
            "in conclusion",
            "agentic velocity",
            "bridge the gap",
            "at the intersection of",
            "seamless orchestration",
            "holistic approach",
            "laser-focused",
        ]
        for rel_path in primary_pages:
            content = self._read(rel_path)
            self.assertNotIn("—", content, f"Em-dash found in {rel_path}")
            self.assertNotIn("&mdash;", content, f"&mdash; entity found in {rel_path}")
            for word in banned_words:
                pattern = re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)
                self.assertIsNone(
                    pattern.search(content),
                    f"Banned AI buzzword '{word}' found in {rel_path}",
                )

    def test_all_local_links_resolve(self):
        html_files = ["index.html", "blog.html", "agent-kernel.html"]
        href_re = re.compile(r'href=["\']([^"\'#?]+)')
        for page in html_files:
            content = self._read(page)
            for match in href_re.finditer(content):
                target = match.group(1)
                if target.startswith(("http://", "https://", "mailto:", "tel:", "javascript:")):
                    continue
                target_path = os.path.normpath(os.path.join(ROOT_DIR, target))
                self.assertTrue(
                    os.path.exists(target_path),
                    f"Broken local link '{target}' in {page}",
                )

    def test_no_soft_404_fallback_and_seo_files_exist(self):
        robots = self._read("robots.txt")
        self.assertIn("Disallow: /blog/blog/", robots)
        self.assertIn("Sitemap: https://www.berlinailabs.de/sitemap.xml", robots)

        sitemap = self._read("sitemap.xml")
        self.assertIn("https://www.berlinailabs.de/agent-kernel.html", sitemap)
        self.assertIn("https://www.berlinailabs.de/blog/agent-harness-steering-graphs.html", sitemap)

        server_js = self._read("server.js")
        self.assertNotIn("let filePath = path.join(__dirname, 'index.html');", server_js)
        self.assertIn("res.writeHead(404,", server_js)


if __name__ == "__main__":
    unittest.main()
